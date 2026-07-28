import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { after, before, describe, test } from "node:test";

const uiUrl = process.env.ACADEMIC_UI_URL?.replace(/\/$/, "");
const password = "Password123!";

function findChrome() {
  const executable = process.platform === "win32" ? ".exe" : "";
  const names = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
  const pathCandidates = (process.env.PATH ?? "")
    .split(delimiter)
    .flatMap((directory) => names.map((name) => join(directory, `${name}${executable}`)));
  const candidates =
    process.platform === "win32"
      ? [
          process.env.CHROME_PATH,
          join(process.env.ProgramFiles ?? "", "Google/Chrome/Application/chrome.exe"),
          join(process.env["ProgramFiles(x86)"] ?? "", "Google/Chrome/Application/chrome.exe"),
          join(process.env.LOCALAPPDATA ?? "", "Google/Chrome/Application/chrome.exe"),
          join(process.env.ProgramFiles ?? "", "Microsoft/Edge/Application/msedge.exe"),
          join(process.env["ProgramFiles(x86)"] ?? "", "Microsoft/Edge/Application/msedge.exe"),
          ...pathCandidates,
        ]
      : [
          process.env.CHROME_PATH,
          "/usr/bin/google-chrome",
          "/usr/bin/google-chrome-stable",
          "/usr/bin/chromium",
          "/usr/bin/chromium-browser",
          ...pathCandidates,
        ];
  const found = candidates.find((candidate) => candidate && existsSync(candidate));
  assert.ok(
    found,
    "Chrome/Chromium not found. Set CHROME_PATH to a Chrome, Chromium, or Edge executable.",
  );
  return found;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForValue(read, description, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  let value;
  while (Date.now() < deadline) {
    value = await read();
    if (value) return value;
    await delay(100);
  }
  assert.fail(`Timed out waiting for ${description}. Last value: ${String(value)}`);
}

class Cdp {
  #id = 0;
  #pending = new Map();

  constructor(url) {
    this.socket = new WebSocket(url);
  }

  async open() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener(
        "error",
        () => reject(new Error("Could not connect to Chrome DevTools Protocol.")),
        { once: true },
      );
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
    return this;
  }

  send(method, params = {}) {
    const id = ++this.#id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.#pending.set(id, { resolve, reject }));
  }

  close() {
    this.socket.close();
  }
}

async function launchBrowser() {
  const profile = await mkdtemp(join(tmpdir(), "sao-do-e2e-"));
  const browser = spawn(
    findChrome(),
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-address=127.0.0.1",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  browser.once("error", (error) => {
    throw error;
  });

  const portFile = join(profile, "DevToolsActivePort");
  const port = await waitForValue(async () => {
    try {
      return Number((await readFile(portFile, "utf8")).split(/\r?\n/, 1)[0]);
    } catch {
      return 0;
    }
  }, "Chrome DevTools port");
  const endpoint = `http://127.0.0.1:${port}`;
  const version = await fetch(`${endpoint}/json/version`).then((response) => response.json());
  const targets = await fetch(`${endpoint}/json/list`).then((response) => response.json());
  const pageTarget = targets.find((target) => target.type === "page");
  assert.ok(pageTarget?.webSocketDebuggerUrl, "Chrome did not expose a page target.");

  return {
    browser,
    profile,
    browserCdp: await new Cdp(version.webSocketDebuggerUrl).open(),
    page: await new Cdp(pageTarget.webSocketDebuggerUrl).open(),
  };
}

async function evaluate(page, fn, ...args) {
  const result = await page.send("Runtime.evaluate", {
    expression: `(${fn})(${args.map((value) => JSON.stringify(value)).join(",")})`,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? "Browser evaluation failed.");
  }
  return result.result.value;
}

async function navigate(page, url) {
  await evaluate(page, () => {
    window.__saoDoE2eBeforeNavigation = true;
  });
  await page.send("Page.navigate", { url });
  await waitForValue(
    () =>
      evaluate(
        page,
        () =>
          !window.__saoDoE2eBeforeNavigation &&
          document.readyState === "complete",
      ),
    `page load for ${url}`,
  );
}

async function waitForDom(page, fn, description, timeout) {
  return waitForValue(() => evaluate(page, fn), description, timeout);
}

async function waitForStableDom(
  page,
  fn,
  description,
  stableFor = 300,
  timeout = 20_000,
) {
  let stableSince = 0;
  return waitForValue(async () => {
    const ready = await evaluate(page, fn);
    if (!ready) {
      stableSince = 0;
      return false;
    }
    if (!stableSince) stableSince = Date.now();
    return Date.now() - stableSince >= stableFor;
  }, description, timeout);
}

async function fill(page, selector, value) {
  const found = await evaluate(
    page,
    (target, nextValue) => {
      const control = document.querySelector(target);
      if (!control) return false;
      const prototype =
        control instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : control instanceof HTMLSelectElement
            ? HTMLSelectElement.prototype
            : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(control, nextValue);
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    },
    selector,
    value,
  );
  assert.equal(found, true, `Could not find ${selector}`);
}

async function pressTab(page) {
  const key = {
    code: "Tab",
    key: "Tab",
    windowsVirtualKeyCode: 9,
  };
  await page.send("Page.bringToFront");
  await page.send("Input.dispatchKeyEvent", { ...key, type: "rawKeyDown" });
  await page.send("Input.dispatchKeyEvent", { ...key, type: "keyUp" });
  await delay(25);
}

async function pressTabUntilName(page, expectedName, attempts = 8) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await pressTab(page);
    const name = await evaluate(
      page,
      () => document.activeElement?.getAttribute("name"),
    );
    if (name === expectedName) return;
  }
  assert.fail(`Tab focus did not reach ${expectedName}.`);
}

async function getAccessibilityTree(page) {
  const { nodes } = await page.send("Accessibility.getFullAXTree");
  return nodes
    .filter((node) => !node.ignored)
    .map((node) => ({
      name: node.name?.value ?? "",
      role: node.role?.value ?? "",
    }));
}

function assertAccessibleNode(nodes, role, name) {
  assert.ok(
    nodes.some(
      (node) =>
        node.role === role &&
        node.name.toLocaleLowerCase("vi").includes(name.toLocaleLowerCase("vi")),
    ),
    `Missing accessible ${role} named "${name}".`,
  );
}

async function measureTextScaleLayout(page, selectors, textSelector) {
  return evaluate(page, (targets, copySelector) => {
    const controls = targets.flatMap((selector) => [
      ...document.querySelectorAll(selector),
    ]);
    const copy = document.querySelector(copySelector);
    const range = document.createRange();
    const copyText = copy?.firstChild;
    if (copyText?.nodeType === Node.TEXT_NODE && copyText.textContent?.length) {
      range.setStart(copyText, 0);
      range.setEnd(copyText, 1);
    } else if (copy) {
      range.selectNodeContents(copy);
    }
    const copyRectangle = copy ? range.getBoundingClientRect() : null;
    const action = controls.at(-1);
    const actionRange = document.createRange();
    if (action) actionRange.selectNodeContents(action);
    const actionRectangle = action ? actionRange.getBoundingClientRect() : null;
    const actionBox = action?.getBoundingClientRect();
    return {
      actionContentFits:
        Boolean(actionRectangle && actionBox) &&
        actionRectangle.left >= actionBox.left &&
        actionRectangle.right <= actionBox.right &&
        actionRectangle.top >= actionBox.top &&
        actionRectangle.bottom <= actionBox.bottom,
      copyHeight: copyRectangle?.height ?? 0,
      copyWidth: copyRectangle?.width ?? 0,
      controlsFit:
        controls.length === targets.length &&
        controls.every((control) => {
          const rectangle = control.getBoundingClientRect();
          return (
            rectangle.width > 0 &&
            rectangle.height > 0 &&
            rectangle.left >= 0 &&
            rectangle.right <= window.innerWidth
          );
        }),
      currentCssZoom: getComputedStyle(document.documentElement).zoom,
      documentScrollWidth: document.documentElement.scrollWidth,
      noDocumentOverflow:
        document.documentElement.scrollWidth <= window.innerWidth,
      viewportWidth: window.innerWidth,
    };
  }, selectors, textSelector);
}

async function assertTextScaleLayout(page, selectors, description) {
  const textSelector = ".academic-form .form-heading h3";
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  let baseline = await measureTextScaleLayout(page, selectors, textSelector);
  assert.ok(baseline.copyHeight > 0, `${description} scale target is missing.`);
  let scaled;
  let mechanism = "Emulation.setEmulatedOSTextScale";

  try {
    await page.send("Emulation.setEmulatedOSTextScale", { scale: 2 });
    await navigate(page, `${uiUrl}/portal`);
    await waitForDom(
      page,
      () =>
        location.pathname === "/portal" &&
        document.body.textContent.includes("Xin chào"),
      `${description} portal at 200% OS text scale`,
      20_000,
    );
    scaled = await measureTextScaleLayout(page, selectors, textSelector);

    if (scaled.copyHeight / baseline.copyHeight < 1.75) {
      await page.send("Emulation.setEmulatedOSTextScale", { scale: 1 });
      await navigate(page, `${uiUrl}/portal`);
      await waitForDom(
        page,
        () =>
          location.pathname === "/portal" &&
          document.body.textContent.includes("Xin chào"),
        `${description} portal before CSS page scale`,
        20_000,
      );
      baseline = await measureTextScaleLayout(page, selectors, textSelector);
      await evaluate(page, () => {
        document.documentElement.style.zoom = "200%";
        document.documentElement.style.width = "50%";
      });
      scaled = await measureTextScaleLayout(page, selectors, textSelector);
      mechanism = "CSS zoom: 200%";
      assert.equal(Number.parseFloat(scaled.currentCssZoom), 2);
    }

    const heightRatio = scaled.copyHeight / baseline.copyHeight;
    const widthRatio = scaled.copyWidth / baseline.copyWidth;
    assert.ok(
      heightRatio >= 1.75 && heightRatio <= 2.25,
      `${description} ${mechanism} height ratio was ${heightRatio.toFixed(2)}.`,
    );
    assert.ok(
      widthRatio >= 1.75 && widthRatio <= 2.25,
      `${description} ${mechanism} width ratio was ${widthRatio.toFixed(2)}.`,
    );
    assert.equal(
      scaled.controlsFit,
      true,
      `${description} controls clip at ${mechanism}.`,
    );
    assert.equal(
      scaled.actionContentFits,
      true,
      `${description} action text clips at ${mechanism}.`,
    );
    return {
      documentOverflow:
        scaled.documentScrollWidth - scaled.viewportWidth,
      heightRatio,
      mechanism,
      widthRatio,
    };
  } finally {
    await page.send("Emulation.setEmulatedOSTextScale", { scale: 1 });
    await evaluate(page, () => {
      document.documentElement.style.zoom = "";
      document.documentElement.style.width = "";
    });
    await page.send("Emulation.clearDeviceMetricsOverride");
    await navigate(page, `${uiUrl}/portal`);
    await waitForDom(
      page,
      () =>
        location.pathname === "/portal" &&
        document.body.textContent.includes("Xin chào"),
      `${description} portal after text-scale reset`,
      20_000,
    );
  }
}

async function login(page, email) {
  await waitForDom(
    page,
    () => {
      const form = document.querySelector("form.login-form");
      const reactProps = form
        ? Object.keys(form).find((key) => key.startsWith("__reactProps$"))
        : null;
      return Boolean(reactProps && typeof form[reactProps]?.onSubmit === "function");
    },
    "hydrated login form",
  );
  await fill(page, 'input[name="email"]', email);
  await fill(page, 'input[name="password"]', password);
  const submitted = await evaluate(page, () => {
    const form = document.querySelector("form.login-form");
    if (!form) return false;
    form.requestSubmit();
    return true;
  });
  assert.equal(submitted, true, "Login form not found.");
  await waitForDom(
    page,
    () =>
      location.pathname === "/portal" &&
      document.body.textContent.includes("Xin chào"),
    `portal session for ${email}`,
    20_000,
  );
}

async function clearSession(page) {
  await page.send("Storage.clearDataForOrigin", {
    origin: new URL(uiUrl).origin,
    storageTypes: "all",
  });
  await page.send("Network.clearBrowserCookies");
}

async function browserApi(page, path, init = {}) {
  return evaluate(
    page,
    async (requestPath, requestInit) => {
      let token = "";
      for (const value of Object.values(localStorage)) {
        try {
          const queue = [JSON.parse(value)];
          while (queue.length) {
            const item = queue.shift();
            if (!item || typeof item !== "object") continue;
            if (typeof item.access_token === "string") {
              token = item.access_token;
              break;
            }
            queue.push(...Object.values(item));
          }
        } catch {
          // Ignore unrelated local-storage values.
        }
        if (token) break;
      }
      if (!token) throw new Error("Authenticated Supabase token not found.");
      const headers = new Headers(requestInit.headers);
      headers.set("Authorization", `Bearer ${token}`);
      if (requestInit.body) headers.set("Content-Type", "application/json");
      const response = await fetch(requestPath, {
        ...requestInit,
        headers,
        body: requestInit.body ? JSON.stringify(requestInit.body) : undefined,
      });
      return {
        status: response.status,
        body: await response.json(),
      };
    },
    path,
    init,
  );
}

describe(
  "academic browser workflow",
  { skip: uiUrl ? false : "Set ACADEMIC_UI_URL to run browser E2E." },
  () => {
    let runtime;
    let page;
    let className;
    let classId;
    let assignmentTitle;
    let assignmentId;

    before(async () => {
      runtime = await launchBrowser();
      page = runtime.page;
      await page.send("Page.enable");
      await page.send("Runtime.enable");
      await page.send("Network.enable");
      await page.send("Accessibility.enable");
      await navigate(page, uiUrl);
    });

    after(async () => {
      if (!runtime) return;
      try {
        await runtime.browserCdp.send("Browser.close");
      } catch {
        runtime.browser.kill();
      }
      runtime.page.close();
      runtime.browserCdp.close();
      await Promise.race([
        new Promise((resolve) => runtime.browser.once("exit", resolve)),
        delay(3_000).then(() => runtime.browser.kill()),
      ]);
      await rm(runtime.profile, { recursive: true, force: true, maxRetries: 3 });
    });

    test("login form submits with POST", async () => {
      const method = await evaluate(
        page,
        () => document.querySelector("form.login-form")?.method,
      );
      assert.equal(method, "post");
    });

    test("login controls have logical keyboard order and visible focus", async () => {
      const controls = await evaluate(page, () =>
        [...document.querySelectorAll("a[href], button, input, select, textarea")]
          .filter(
            (control) =>
              !control.disabled &&
              control.getClientRects().length > 0 &&
              getComputedStyle(control).visibility !== "hidden",
          )
          .map((control) => ({
            name:
              control.getAttribute("aria-label") ||
              control.labels?.[0]?.textContent?.trim() ||
              control.textContent?.trim() ||
              "",
            tabIndex: control.tabIndex,
          })),
      );
      assert.ok(controls.length >= 5);
      assert.equal(controls.some((control) => control.tabIndex > 0), false);
      assert.equal(controls.every((control) => control.name.length > 0), true);

      await evaluate(page, () =>
        document.querySelector('input[name="email"]')?.focus(),
      );
      await pressTab(page);
      const passwordFocus = await evaluate(page, () => {
        const active = document.activeElement;
        const style = getComputedStyle(active);
        return {
          name: active?.getAttribute("name"),
          outlineWidth: Number.parseFloat(style.outlineWidth),
          boxShadow: style.boxShadow,
        };
      });
      assert.equal(passwordFocus.name, "password");
      assert.ok(
        passwordFocus.outlineWidth >= 3 ||
          passwordFocus.boxShadow !== "none",
      );

      await pressTab(page);
      assert.equal(
        await evaluate(
          page,
          () => document.activeElement?.getAttribute("type"),
        ),
        "submit",
      );
    });

    test("login controls expose stable accessible names and roles", async () => {
      const nodes = await getAccessibilityTree(page);
      assertAccessibleNode(nodes, "textbox", "Email");
      assertAccessibleNode(nodes, "textbox", "Mật khẩu");
      assertAccessibleNode(nodes, "button", "Đăng nhập");
    });

    test("critical login flow fits a 320px CSS viewport", async () => {
      await page.send("Emulation.setDeviceMetricsOverride", {
        width: 320,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await navigate(page, uiUrl);
      const layout = await evaluate(page, () => {
        const controls = [
          ...document.querySelectorAll(
            'form.login-form input, form.login-form button[type="submit"]',
          ),
        ];
        return {
          noDocumentOverflow:
            document.documentElement.scrollWidth <= window.innerWidth,
          controlsFit: controls.every((control) => {
            const rectangle = control.getBoundingClientRect();
            return rectangle.left >= 0 && rectangle.right <= window.innerWidth;
          }),
        };
      });
      assert.deepEqual(layout, {
        controlsFit: true,
        noDocumentOverflow: true,
      });
      await page.send("Emulation.clearDeviceMetricsOverride");
      await navigate(page, uiUrl);
    });

    test("admin login keeps the password out of the URL", async () => {
      await login(page, "admin.a@saodo.test");
      const currentUrl = await evaluate(page, () => location.href);
      assert.equal(currentUrl.includes(password), false);
      assert.equal(currentUrl.includes(encodeURIComponent(password)), false);
    });

    test("admin form has logical keyboard order, visible focus, and AX names", async () => {
      await waitForDom(
        page,
        () =>
          !document.querySelector(
            "form.academic-form button[type=\"submit\"]",
          )?.disabled,
        "enabled admin form",
        20_000,
      );
      const nodes = await getAccessibilityTree(page);
      assertAccessibleNode(nodes, "textbox", "Tên lớp");
      assertAccessibleNode(nodes, "combobox", "Giảng viên");
      assertAccessibleNode(nodes, "button", "Tạo lớp");

      const studentCount = await evaluate(
        page,
        () => document.querySelectorAll('input[name="studentIds"]').length,
      );
      assert.ok(studentCount > 0);
      await evaluate(page, () =>
        document.querySelector('input[name="name"]')?.focus(),
      );
      await pressTab(page);
      assert.equal(
        await evaluate(page, () => document.activeElement?.getAttribute("name")),
        "teacherId",
      );
      await pressTab(page);
      assert.equal(
        await evaluate(page, () => document.activeElement?.getAttribute("name")),
        "studentIds",
      );
      for (let index = 1; index < studentCount; index += 1) {
        await pressTab(page);
      }
      await pressTab(page);
      const actionFocus = await evaluate(page, () => {
        const active = document.activeElement;
        const style = getComputedStyle(active);
        return {
          outlineWidth: Number.parseFloat(style.outlineWidth),
          text: active?.textContent?.trim(),
          type: active?.getAttribute("type"),
        };
      });
      assert.equal(actionFocus.type, "submit");
      assert.ok(actionFocus.text?.includes("Tạo lớp"));
      assert.ok(actionFocus.outlineWidth >= 3);

    });

    test("admin creates a class with the seeded teacher and student", async () => {
      className = `E2E class ${Date.now()}`;
      await fill(page, 'form.academic-form input[name="name"]', className);

      const selectedMembers = await evaluate(page, () => {
        const teacher = document.querySelector('select[name="teacherId"]');
        const teacherOption = [...teacher.options].find((option) =>
          option.textContent.includes("teacher.a@saodo.test"),
        );
        const student = [...document.querySelectorAll('input[name="studentIds"]')].find(
          (input) => input.closest("label")?.textContent.includes("student.a@saodo.test"),
        );
        if (!teacherOption || !student) return false;
        teacher.value = teacherOption.value;
        teacher.dispatchEvent(new Event("change", { bubbles: true }));
        student.click();
        return true;
      });
      assert.equal(selectedMembers, true, "Seeded teacher/student options not found.");

      const submitted = await evaluate(page, () => {
        const form = document.querySelector("form.academic-form");
        if (!form) return false;
        form.requestSubmit();
        return true;
      });
      assert.equal(submitted, true);
      await waitForValue(
        () =>
          evaluate(
            page,
            (expected) => document.body.textContent.includes(expected),
            className,
          ),
        `new class ${className}`,
        20_000,
      );
    });

    test("cleared session cannot reopen the portal", async () => {
      await clearSession(page);
      await navigate(page, `${uiUrl}/portal`);
      await waitForDom(
        page,
        () => location.pathname === "/" && location.hash === "#dang-nhap",
        "portal redirect after session clear",
        20_000,
      );
    });

    test("teacher form has logical keyboard order, visible focus, and AX names", async () => {
      await login(page, "teacher.a@saodo.test");
      await waitForValue(
        () =>
          evaluate(
            page,
            (expected) => document.body.textContent.includes(expected),
            className,
          ),
        `teacher visibility of ${className}`,
        20_000,
      );
      const selected = await evaluate(page, (expected) => {
        const button = [...document.querySelectorAll("button")].find((candidate) =>
          candidate.textContent.includes(expected),
        );
        button?.click();
        return Boolean(button);
      }, className);
      assert.equal(selected, true);

      await waitForStableDom(
        page,
        () => {
          const form = document.querySelector("form.assignment-form");
          const submit = form?.querySelector('button[type="submit"]');
          return Boolean(
            form &&
              !document.querySelector(".section-loading") &&
              submit &&
              !submit.disabled,
          );
        },
        "stable teacher assignment form",
      );

      const nodes = await getAccessibilityTree(page);
      assertAccessibleNode(nodes, "textbox", "Tiêu đề");
      assertAccessibleNode(nodes, "textbox", "Yêu cầu");
      assertAccessibleNode(nodes, "button", "Công bố bài tập");

      await evaluate(page, () =>
        document.querySelector('form.assignment-form input[name="title"]')?.focus(),
      );
      assert.equal(
        await evaluate(
          page,
          () => document.activeElement?.getAttribute("name"),
        ),
        "title",
      );
      const controlOrder = await evaluate(page, () =>
        [...document.querySelector("form.assignment-form").elements].map(
          (control) => ({
            name: control.getAttribute("name") ?? "submit",
            tabIndex: control.tabIndex,
          }),
        ),
      );
      assert.deepEqual(
        controlOrder.map((control) => control.name),
        ["title", "dueAt", "instructions", "submit"],
      );
      assert.equal(
        controlOrder.every((control) => control.tabIndex === 0),
        true,
      );
      await evaluate(page, () =>
        document
          .querySelector('form.assignment-form textarea[name="instructions"]')
          ?.focus(),
      );
      await pressTab(page);
      const actionFocus = await evaluate(page, () => {
        const active = document.activeElement;
        return {
          tagName: active?.tagName,
          name: active?.getAttribute("name"),
          outlineWidth: Number.parseFloat(
            getComputedStyle(active).outlineWidth,
          ),
          text: active?.textContent?.trim(),
          type: active?.getAttribute("type"),
        };
      });
      assert.equal(actionFocus.type, "submit", JSON.stringify(actionFocus));
      assert.ok(actionFocus.text?.includes("Công bố"));
      assert.ok(actionFocus.outlineWidth >= 3);

    });

    test("assigned teacher publishes an assignment from the portal", async () => {
      assignmentTitle = `E2E assignment ${Date.now()}`;
      await fill(page, 'form.assignment-form input[name="title"]', assignmentTitle);
      await fill(
        page,
        'form.assignment-form textarea[name="instructions"]',
        "Browser E2E critical-path assignment.",
      );
      const submitted = await evaluate(page, () => {
        const form = document.querySelector("form.assignment-form");
        if (!form) return false;
        form.requestSubmit();
        return true;
      });
      assert.equal(submitted, true);
      await waitForValue(
        () =>
          evaluate(
            page,
            (expected) =>
              document.body.textContent.includes(expected) &&
              document.body.textContent.includes("Đã công bố"),
            assignmentTitle,
          ),
        `published assignment ${assignmentTitle}`,
        20_000,
      );

      const session = await browserApi(page, "/api/classes");
      assert.equal(session.status, 200);
      classId = session.body.classes.find((item) => item.name === className)?.id;
      assert.match(classId, /^[0-9a-f-]{36}$/i);
      const assignmentResult = await browserApi(
        page,
        `/api/assignments?classId=${encodeURIComponent(classId)}`,
      );
      assert.equal(assignmentResult.status, 200);
      assignmentId = assignmentResult.body.assignments.find(
        (item) => item.title === assignmentTitle,
      )?.id;
      assert.match(assignmentId, /^[0-9a-f-]{36}$/i);
    });

    test("assigned student submits text through the authenticated BFF", async () => {
      await clearSession(page);
      await navigate(page, uiUrl);
      await login(page, "student.a@saodo.test");
      const submitted = await browserApi(page, "/api/submissions", {
        method: "POST",
        headers: { "Idempotency-Key": randomUUID() },
        body: {
          assignmentId,
          content: "Student browser E2E response.",
        },
      });
      assert.equal(
        submitted.status,
        201,
        `Submission failed: ${JSON.stringify(submitted.body)}`,
      );
      assert.equal(submitted.body.submission.status, "submitted");
    });

    test("teacher sends feedback through the portal form", async () => {
      await clearSession(page);
      await navigate(page, uiUrl);
      await login(page, "teacher.a@saodo.test");
      await waitForValue(
        () =>
          evaluate(
            page,
            (expected) => document.body.textContent.includes(expected),
            className,
          ),
        `teacher visibility of ${className}`,
        20_000,
      );
      const selectedClass = await evaluate(page, (expected) => {
        const button = [...document.querySelectorAll("button")].find((candidate) =>
          candidate.textContent.includes(expected),
        );
        button?.click();
        return Boolean(button);
      }, className);
      assert.equal(selectedClass, true);
      await waitForValue(
        () =>
          evaluate(
            page,
            (expected) => document.body.textContent.includes(expected),
            assignmentTitle,
          ),
        `teacher assignment ${assignmentTitle}`,
        20_000,
      );
      const selectedAssignment = await evaluate(page, (expected) => {
        const button = [...document.querySelectorAll(".assignment-list button")].find(
          (candidate) => candidate.textContent.includes(expected),
        );
        button?.click();
        return Boolean(button);
      }, assignmentTitle);
      assert.equal(selectedAssignment, true);
      await waitForDom(
        page,
        () => Boolean(document.querySelector('textarea[name="feedback"]')),
        "teacher feedback form",
        20_000,
      );

      const feedback = "Teacher browser E2E feedback.";
      await fill(page, 'textarea[name="feedback"]', feedback);
      const submitted = await evaluate(page, () => {
        const form = document.querySelector('textarea[name="feedback"]')?.closest("form");
        if (!form) return false;
        form.requestSubmit();
        return true;
      });
      assert.equal(submitted, true);
      await waitForValue(
        () =>
          evaluate(
            page,
            (expected) =>
              document.body.textContent.includes("Đã phản hồi") &&
              document.body.textContent.includes("Đã gửi phản hồi cho sinh viên.") &&
              document.querySelector('textarea[name="feedback"]')?.value === expected,
            feedback,
          ),
        "reviewed submission and success notice",
        20_000,
      );
    });

    test("admin critical form remains usable at measured 200% text scale", async (context) => {
      await clearSession(page);
      await navigate(page, uiUrl);
      await login(page, "admin.a@saodo.test");
      const evidence = await assertTextScaleLayout(
        page,
        [
          'form.academic-form input[name="name"]',
          'form.academic-form select[name="teacherId"]',
          "form.academic-form button[type=\"submit\"]",
        ],
        "admin",
      );
      context.diagnostic(
        `${evidence.mechanism}; glyph ${evidence.widthRatio.toFixed(2)}x wide, ${evidence.heightRatio.toFixed(2)}x high; critical form fits; document overflow ${evidence.documentOverflow}px`,
      );
    });

    test("teacher critical form remains usable at measured 200% text scale", async (context) => {
      await clearSession(page);
      await navigate(page, uiUrl);
      await login(page, "teacher.a@saodo.test");
      await waitForValue(
        () =>
          evaluate(
            page,
            (expected) => document.body.textContent.includes(expected),
            className,
          ),
        `teacher visibility of ${className} for text scale`,
        20_000,
      );
      await evaluate(page, (expected) => {
        const button = [...document.querySelectorAll("button")].find((candidate) =>
          candidate.textContent.includes(expected),
        );
        button?.click();
      }, className);
      await waitForDom(
        page,
        () => Boolean(document.querySelector("form.assignment-form")),
        "teacher form for text scale",
        20_000,
      );
      const evidence = await assertTextScaleLayout(
        page,
        [
          'form.assignment-form input[name="title"]',
          'form.assignment-form textarea[name="instructions"]',
          "form.assignment-form button[type=\"submit\"]",
        ],
        "teacher",
      );
      context.diagnostic(
        `${evidence.mechanism}; glyph ${evidence.widthRatio.toFixed(2)}x wide, ${evidence.heightRatio.toFixed(2)}x high; critical form fits; document overflow ${evidence.documentOverflow}px`,
      );
    });
  },
);

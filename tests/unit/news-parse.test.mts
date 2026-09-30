import assert from "node:assert/strict";
import { test } from "node:test";
import { extractArticle, facebookItem, fallbackSummary, isPublicHttpUrl, parseRss } from "../../apps/web/src/lib/news-parse.ts";

// Shape of the school's NukeViet feed (https://saodo.edu.vn/vi/news/rss/thong-bao/).
const feed = `<?xml version="1.0" encoding="utf-8"?><rss><channel><title>Tin Tức</title>
  <item>
    <title>Thông báo về việc nghỉ Tết nguyên đán Bính Ngọ năm 2026</title>
    <link>https://saodo.edu.vn:443/vi/news/tin-tuc-su-kien/thong-bao-nghi-tet-2833.html</link>
    <guid isPermaLink="false"><![CDATA[news_2833]]></guid>
    <description><![CDATA[<img src="/assets/news/2026_02/tet.jpg" width="100" align="left" border="0">]]></description>
    <pubDate>Fri, 6 Feb 2026 07:02:12 GMT</pubDate>
  </item>
  <item><title>Sinh viên &amp; doanh nghiệp</title><link>http://cntt.saodo.edu.vn/vi/news/a-1.html</link><pubDate>bad</pubDate></item>
  <item><title></title><link>https://saodo.edu.vn/x.html</link></item>
</channel></rss>`;

test("reads NukeViet RSS: default port dropped, relative image resolved, entities decoded", () => {
  const items = parseRss(feed, "https://saodo.edu.vn/vi/news/rss/thong-bao/");
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    url: "https://saodo.edu.vn/vi/news/tin-tuc-su-kien/thong-bao-nghi-tet-2833.html",
    title: "Thông báo về việc nghỉ Tết nguyên đán Bính Ngọ năm 2026",
    summary: "",
    image_url: "https://saodo.edu.vn/assets/news/2026_02/tet.jpg",
    published_at: "2026-02-06T07:02:12.000Z",
  });
  assert.equal(items[1]!.title, "Sinh viên & doanh nghiệp");
  assert.equal(items[1]!.published_at, null);
});

test("pulls lead, image and body text from an article page", () => {
  const html = `<meta property="og:title" content="Tiêu đề &#x3A; A"><meta property="og:description" content="Ngày 26&#x002F;9 hội nghị.">
    <meta property="og:image" content="https://saodo.edu.vn:443/uploads/a.jpg">
    <div id="news-bodyhtml" class="bodytext"><p>Đoạn một.</p><script>x()</script><p>Đoạn&nbsp;hai.</p></div>`;
  assert.deepEqual(extractArticle(html, "https://saodo.edu.vn/a.html"), {
    title: "Tiêu đề : A",
    lead: "Ngày 26/9 hội nghị.",
    image_url: "https://saodo.edu.vn/uploads/a.jpg",
    text: "Đoạn một.\nĐoạn hai.",
  });
});

test("ignores the CMS placeholder picture", () => {
  const html = '<meta property="og:image" content="http://luat.saodo.edu.vn/uploads/no_images.jpg">';
  assert.equal(extractArticle(html, "http://luat.saodo.edu.vn/a.html").image_url, null);
});

test("turns a Facebook page post into an item", () => {
  const item = facebookItem({ id: "1_2", message: "Lễ khai giảng năm học mới\nChiều nay tại hội trường A.", permalink_url: "https://www.facebook.com/TruongDHSaoDo/posts/2", created_time: "2026-09-29T10:00:00+0000" });
  assert.equal(item?.title, "Lễ khai giảng năm học mới");
  assert.equal(item?.summary, "Chiều nay tại hội trường A.");
  assert.equal(item?.published_at, "2026-09-29T10:00:00.000Z");
  assert.equal(facebookItem({ id: "x", permalink_url: "https://facebook.com/p" }), null);
});

test("keeps the server away from local and private addresses", () => {
  assert.ok(isPublicHttpUrl("http://cntt.saodo.edu.vn/vi/news/rss/"));
  for (const bad of ["http://localhost:3000/", "http://127.0.0.1/", "http://192.168.1.10/rss", "http://10.0.0.5/", "http://[::1]/", "file:///etc/passwd", "http://user:pw@saodo.edu.vn/", "http://intranet/", "http://db.internal/"]) {
    assert.equal(isPublicHttpUrl(bad), false, bad);
  }
});

test("fallback summary cuts at a sentence", () => {
  const long = `${"Câu mở đầu khá dài để vượt qua giới hạn tối thiểu. ".repeat(8)}Cuối.`;
  const summary = fallbackSummary("", long);
  assert.ok(summary.length <= 321 && summary.endsWith("."));
  assert.equal(fallbackSummary("Ngắn gọn.", long), "Ngắn gọn.");
});

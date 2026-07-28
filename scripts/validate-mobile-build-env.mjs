if (process.env.EAS_BUILD !== "true") {
  process.stdout.write("Mobile build environment check skipped outside EAS.\n");
  process.exit(0);
}

const required = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_API_URL",
];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  throw new Error(`Missing EAS environment variables: ${missing.join(", ")}`);
}

const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim();
const publishableKey = /^sb_publishable_[A-Za-z0-9_-]{20,}$/.test(anonKey);
let anonJwt = false;

if (!publishableKey && !anonKey.startsWith("sb_secret_")) {
  try {
    const parts = anonKey.split(".");
    if (
      parts.length === 3 &&
      parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))
    ) {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf8"),
      );
      anonJwt = payload?.role === "anon";
    }
  } catch {
    // Invalid JWTs fail through the shared gate below.
  }
}

if (!publishableKey && !anonJwt) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_ANON_KEY must be a publishable key or JWT with role anon.",
  );
}

for (const name of ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_API_URL"]) {
  const value = new URL(process.env[name]);
  if (
    value.protocol !== "https:" ||
    ["localhost", "127.0.0.1", "10.0.2.2"].includes(value.hostname)
  ) {
    throw new Error(`${name} must be a reachable HTTPS URL for EAS builds.`);
  }
}

process.stdout.write("Mobile EAS environment check passed.\n");

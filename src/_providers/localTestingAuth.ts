import { getRuntimeConfig } from "@macrostrat-web/settings";

/** True when the app is running with the local-testing auth escape hatch
 * (`VITE_LOCAL_TESTING_AUTH=true`), which stands in a mock user so admin pages
 * and the knowledge-graph editor can be exercised without a real login.
 *
 * Read through `getRuntimeConfig` — `process.env` on the server, the injected
 * `window.env` in the browser — rather than `import.meta.env`: the client
 * transform rewrites `import.meta.env` to `null` in this app, so the old check
 * was silently always false in the browser and the mock user never applied. */
export const isLocalTesting = (): boolean => {
  return getRuntimeConfig("LOCAL_TESTING_AUTH", null) === "true";
};

export const mockUser = {
  id: 46,
  name: "Local Tester",
  email: "local@test",
  role: "web_admin",
  roles: ["web_admin"],
  groups: [{ id: 1, name: "web_admin" }],
  sub: "local-mock",
};

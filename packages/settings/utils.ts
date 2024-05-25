export function getRuntimeConfig(
  key: string,
  defaultValue: string = null
): string {
  /** Get a configuration variable from the environment, either directly (node) or via a server-defined mapping */
  let val: string | undefined;
  const activeEnv = typeof window === "undefined" ? "server" : "client";
  if (import.meta.env.SSR) {
    // We are running on the server, try to get directly from process.env
    val = globalThis.environment[key];
  } else {
    // We are running on the client and have access to window.env
    val = window.env[key];
  }
  if (val === undefined) {
    val = import.meta.env["VITE_" + key];
    if (val !== undefined && import.meta.env.DEV) {
      console.warn(`Environment variable ${key} loaded statically`);
    }
  }

  if (val === undefined && defaultValue === undefined) {
    console.warn(`Environment variable ${key} not found (${activeEnv})`);
  }
  return val ?? defaultValue;
}

// Synthesize the config from the environment at runtime

export async function onCreateGlobalContext(globalContext) {
  // Modify the global context
  globalContext.environment = synthesizeConfigFromEnvironment();
}

function synthesizeConfigFromEnvironment() {
  /** Creates a mapping of environment variables that start with VITE_,
   * and returns them as an object. This allows us to pass environment
   * variables to the client at runtime.
   *
   * TODO: Ideally this would be defined in a library.
   * */
  const env = {};
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("VITE_")) {
      let newKey = key.substring(5);
      env[newKey] = process.env[key];
    }
  }
  return env;
}

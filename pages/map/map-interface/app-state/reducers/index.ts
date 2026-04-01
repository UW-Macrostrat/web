import { coreReducer } from "./core";
import { hashStringReducer } from "./hash-string";
import { AppAction, AppState } from "./types";

export default function appReducer(
  state: AppState | undefined,
  action: AppAction
) {
  // This might not be the right way to do hash management, but it
  // centralizes the logic in one place.
  return hashStringReducer(coreReducer(state, action), action);
}

export * from "./core";
export * from "./hash-string";
export * from "./types";

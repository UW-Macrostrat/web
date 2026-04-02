import { actionRunner } from "./handlers";
import { useCallback } from "react";

import { AppAction, AppState } from "./types";
import { historyManager } from "./navigation";
import { coreReducer, createInitialState } from "./reducer";
import { create } from "zustand";

export function appReducer(
  state: AppState | null | undefined,
  action: AppAction
) {
  // This might not be the right way to do hash management, but it
  // centralizes the logic in one place.
  const nextState = coreReducer(state, action);
  if (action.type == "set-location") {
    return nextState;
  }
  historyManager(state, nextState);
  return nextState;
}

type SelectorFn = (state: AppState) => any;

export type StateGetter = (selector?: SelectorFn) => any;

interface ZustandState {
  coreState: AppState;
  dispatch: (nextState: AppState) => void;
  getState: StateGetter;
  asyncDispatch: (action: AppAction) => Promise<void>;
}

export const useStore = create<ZustandState>((set, get) => {
  const dispatch = (action: AppAction) =>
    set((state: ZustandState) => {
      return {
        ...state,
        coreState: appReducer(state.coreState, action),
      };
    });

  const defaultSelector = (state: AppState) => state;
  const getState = (selector: SelectorFn = defaultSelector) => {
    return selector(get().coreState);
  };

  return {
    coreState: createInitialState(),
    dispatch,
    getState,
    asyncDispatch: async (action: AppAction): Promise<void> => {
      const newAction = await actionRunner(getState, action, dispatch);
      if (newAction == undefined) {
        return;
      }
      dispatch(newAction as AppAction);
    },
  };
});

export function useDispatch() {
  return useStore((store) => store.dispatch);
}

export function useAppActions(): (action: AppAction) => Promise<void> {
  return useStore((state) => state.asyncDispatch);
}

export function useAppState<T>(selectorFn: (state: AppState) => T): T {
  const wrappedSelector = useCallback(
    (state: ZustandState) => {
      if (state.coreState == null) {
        throw new Error("App state is not initialized");
      }
      return selectorFn(state.coreState);
    },
    [selectorFn]
  );
  return useStore(wrappedSelector);
}

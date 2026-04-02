import { actionRunner } from "./handlers";
import React, { useCallback } from "react";
import { isCancel } from "axios";

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

interface ZustandState {
  coreState: AppState | null | undefined;
  dispatch: (nextState: AppState) => void;
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

  return {
    coreState: createInitialState(),
    dispatch,
    asyncDispatch: async (action: AppAction): Promise<void> => {
      const newAction = await actionRunner(get().coreState, action, dispatch);
      if (newAction == undefined) {
        return;
      }
      dispatch(newAction as AppAction);
    },
  };
});

function useActionDispatch() {
  return useStore((store) => store.dispatch);
}

function useAppActions(): (action: AppAction) => Promise<void> {
  return useStore((state) => state.asyncDispatch);
}

function useAppState<T>(selectorFn: (state: AppState) => T): T {
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

export { useAppActions, useAppState };

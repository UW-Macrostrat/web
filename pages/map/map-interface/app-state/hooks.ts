import { AppAction } from "./reducer";
import actionRunner from "./handlers";
import { useStore, useSelector, useDispatch } from "react-redux";
import { AppState } from "./types";
import React, { useCallback } from "react";
import { isCancel } from "axios";

function useActionDispatch() {
  return useDispatch<React.Dispatch<AppAction>>();
}

function useAppActions(): (action: AppAction) => Promise<void> {
  const dispatch = useActionDispatch();
  const store = useStore<AppState, AppAction>();
  return useCallback(
    async (action) => {
      const appState = store.getState();
      try {
        const newAction = await actionRunner(appState, action, dispatch);
        if (newAction == undefined || newAction == null) return;
        dispatch(newAction as AppAction);
      } catch (err) {
        // Handle axios cancelled errors
        if (isCancel(err)) {
          // Silently ignore cancelled requests
          console.log("Canceled request");
          return;
        }

        console.error(err);
      }
    },
    [store, dispatch]
  );
}

function useAppState<T>(selectorFn: (state: AppState) => T): T {
  return useSelector<AppState>(selectorFn) as T;
}

export { useAppActions, useAppState };

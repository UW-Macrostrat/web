import { AppAction } from "./reducers";
import actionRunner from "./handlers";
import { useStore, useSelector, useDispatch } from "react-redux";
import { AppState } from ".";
import React from "react";

function useActionDispatch() {
  return useDispatch<React.Dispatch<AppAction>>();
}

function useAppActions(): (action: AppAction) => Promise<void> {
  const dispatch = useActionDispatch();
  const store = useStore<AppState, AppAction>();
  return async (action) => {
    const appState = store.getState();
    const newAction = await actionRunner(appState, action, dispatch);
    if (newAction == undefined || newAction == null) return;
    dispatch(newAction as AppAction);
  };
}

function useAppState<T>(selectorFn: (state: AppState) => T): T {
  return useSelector<AppState>(selectorFn) as T;
}

export { useAppActions, useAppState };

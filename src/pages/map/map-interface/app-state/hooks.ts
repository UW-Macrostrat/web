import { AppAction } from "./reducers";
import actionRunner from "./handlers";
import { useStore, useSelector, useDispatch } from "react-redux";
import { AppState } from ".";
import React from "react";
import { useEffect } from "react";

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

function useFilterState() {
  const { filters, filtersOpen } = useSelector((state) => state.core);
  return { filters, filtersOpen };
}

function useSearchState() {
  return useSelector((state) => {
    const { searchResults, isSearching, term, inputFocus, infoDrawerOpen } =
      state.core;
    return { searchResults, isSearching, term, inputFocus, infoDrawerOpen };
  });
}

function useMenuState() {
  const { menuOpen, infoDrawerOpen } = useSelector((state) => state.core);
  const menu = useSelector((state) => state.menu);
  return { menuOpen, infoDrawerOpen, ...menu };
}

function useAppState<T>(selectorFn: (state: AppState) => T): T {
  return useSelector<AppState>(selectorFn) as T;
}

interface OutsideClickI {
  ref: React.RefObject<HTMLElement>;
  fn: (event: Event) => void;
}

function useOutsideClick(props: OutsideClickI) {
  const { ref, fn } = props;

  useEffect(() => {
    function handleOutsideClick(event) {
      if (ref.current && !ref.current?.contains(event.target)) {
        return fn(event);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [ref]);
}

export {
  useAppActions,
  useFilterState,
  useSearchState,
  useMenuState,
  useAppState,
  useOutsideClick,
};

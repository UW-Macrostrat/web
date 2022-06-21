import { Action } from "./sections";
import actionRunner from "./handlers";
import { useStore, useSelector, useDispatch } from "react-redux";
import { AppState } from ".";
import React from "react";
import { useEffect } from "react";

function useActionDispatch() {
  return useDispatch<React.Dispatch<Action>>();
}

function useAppActions(): (action: Action) => Promise<void> {
  const dispatch = useActionDispatch();
  const store = useStore<AppState, Action>();
  return async (action) => {
    const coreState = store.getState().core;
    const newAction = await actionRunner(coreState, action, dispatch);
    if (newAction === undefined) return;
    dispatch(newAction as Action);
  };
}

function useFilterState() {
  const { filters, filtersOpen } = useSelector((state) => state.core);
  return { filters, filtersOpen };
}

function useSearchState() {
  const { searchResults, isSearching, term, inputFocus, infoDrawerOpen } =
    useSelector((state) => state.core);
  return { searchResults, isSearching, term, inputFocus, infoDrawerOpen };
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
      console.log(ref.current);
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

import { Action } from "./sections";
import actionRunner from "./handlers";
import { useStore, useSelector, useDispatch } from "react-redux";
import { AppState } from ".";

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

export {
  useAppActions,
  useFilterState,
  useSearchState,
  useMenuState,
  useAppState,
};

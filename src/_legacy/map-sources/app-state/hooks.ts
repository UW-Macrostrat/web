import { useDispatch, useSelector } from "react-redux";
import { BurwellSourceActions as Action, BurwellState } from "./types";
import actionRunner from "./action-runner";

function useActionDispatch() {
  return useDispatch<React.Dispatch<Action>>();
}

function useBurwellActions(): (action: Action) => Promise<void> {
  const dispatch = useActionDispatch();
  return async (action) => {
    const newAction = await actionRunner(action);
    if (newAction === undefined) return;
    dispatch(newAction as Action);
  };
}
function useBurwellState<T>(selectorFn: (state: BurwellState) => T): T {
  return useSelector<BurwellState>(selectorFn) as T;
}

export { useBurwellActions, useBurwellState };

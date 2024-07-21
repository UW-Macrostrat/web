import { useEffect, useRef, Dispatch, useCallback } from "react";
import update, { Spec } from "immutability-helper";

type RequestData = {
  url: string;
  size: number;
  decodedSize: number;
  duration: number;
};

export type ResourceCounts = {
  totalSize: number;
  requests: RequestData[];
};

export type MapPerformanceStep = ResourceCounts & {
  startTime: number;
  endTime: number | null;
  name?: string;
};

type ResetPerformanceCounter = {
  type: "reset-performance-counter";
  name?: string;
};
type AddPerformanceData = { type: "add-performance-data"; data: RequestData[] };

export type PerformanceAction = ResetPerformanceCounter | AddPerformanceData;

export type PerformanceState = ResourceCounts & {
  steps: MapPerformanceStep[];
  resetToken: number;
};

const emptyStep = (name?: string): MapPerformanceStep => {
  return {
    totalSize: 0,
    startTime: performance.now(),
    endTime: null,
    requests: [],
    name,
  };
};

const initialState: PerformanceState = {
  totalSize: 0,
  requests: [],
  resetToken: 0,
  steps: [emptyStep()],
};

export function performanceReducer(
  state: PerformanceState = initialState,
  action: PerformanceAction
): PerformanceState {
  const currentStepIx = state.steps.length - 1;
  switch (action.type) {
    case "reset-performance-counter":
      let steps: Spec<MapPerformanceStep[]> = {
        [currentStepIx]: { endTime: { $set: performance.now() } },
        $push: [emptyStep(action.name)],
      };
      if (state.steps[currentStepIx].requests.length == 0) {
        steps = { [currentStepIx]: { $set: emptyStep(action.name) } };
      }
      return update(state, {
        steps,
        resetToken: { $set: state.resetToken + 1 },
      });
    case "add-performance-data":
      const { data } = action;
      let totalSize = 0;
      for (const req of data) {
        totalSize += req.size;
      }
      const resourceSpec: Spec<ResourceCounts> = {
        totalSize: {
          $apply(v) {
            return v + totalSize;
          },
        },
        requests: { $push: data },
      };

      return update(state, {
        ...resourceSpec,
        steps: {
          [currentStepIx]: {
            ...resourceSpec,
          },
        },
      });
    default:
      return state;
  }
}

function buildPerformanceData(data: PerformanceResourceTiming): RequestData {
  return {
    url: data.name,
    size: data.transferSize,
    decodedSize: data.decodedBodySize,
    duration: data.duration,
  };
}

export function usePerformanceWatcher(
  dispatch: Dispatch<PerformanceAction>,
  resetToken: 0
) {
  const observerRef = useRef<PerformanceObserver>();
  const callback = useCallback(
    (data: PerformanceObserverEntryList) => {
      dispatch({
        type: "add-performance-data",
        data: data.getEntries().map(buildPerformanceData),
      });
      performance.clearResourceTimings();
    },
    [dispatch, resetToken]
  );

  useEffect(() => {
    const observer = new PerformanceObserver(callback);
    observer.observe({ entryTypes: ["resource"] });
    observerRef.current = observer;
    return () => observerRef.current.disconnect();
  }, [callback, resetToken]);

  return [observerRef];
}

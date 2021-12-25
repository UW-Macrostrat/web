import { useEffect, Dispatch } from "react";
import update, { Spec } from "immutability-helper";

type RequestData = {
  url: string;
  size: number;
  duration: number;
};

type ResourceCounts = {
  requestCount: number;
  totalSize: number;
};

type MapPerformanceStep = ResourceCounts & {
  startTime: number;
  endTime: number | null;
  requests: RequestData[];
};

type ResetPerformanceCounter = { type: "reset-performance-counter" };
type AddPerformanceData = { type: "add-performance-data"; data: RequestData[] };

export type PerformanceAction = ResetPerformanceCounter | AddPerformanceData;

type PerformanceState = ResourceCounts & {
  steps: MapPerformanceStep[];
};

const emptyStep = () => {
  return {
    requestCount: 0,
    totalSize: 0,
    startTime: performance.now(),
    endTime: null,
    requests: [],
  };
};

const initialState: PerformanceState = {
  requestCount: 0,
  totalSize: 0,
  steps: [emptyStep()],
};

export function performanceReducer(
  state: PerformanceState = initialState,
  action: PerformanceAction
): PerformanceState {
  const currentStepIx = state.steps.length - 1;
  switch (action.type) {
    case "reset-performance-counter":
      return update(state, {
        steps: {
          [currentStepIx]: { endTime: { $set: performance.now() } },
          $push: [emptyStep()],
        },
      });
    case "add-performance-data":
      const { data } = action;
      let requestCount = 0;
      let totalSize = 0;
      for (const req of data) {
        requestCount += 1;
        totalSize += req.size;
      }
      const resourceSpec: Spec<ResourceCounts> = {
        requestCount: {
          $apply(v) {
            return v + requestCount;
          },
        },
        totalSize: {
          $apply(v) {
            return v + totalSize;
          },
        },
      };

      return update(state, {
        ...resourceSpec,
        steps: {
          [currentStepIx]: {
            requests: { $push: data },
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
    duration: data.duration,
  };
}

export function MapPerformanceObserver({
  dispatch,
}: {
  dispatch: Dispatch<PerformanceAction>;
}) {
  useEffect(() => {
    function callback(data: PerformanceObserverEntryList) {
      dispatch({
        type: "add-performance-data",
        data: data.getEntries().map(buildPerformanceData),
      });
    }
    const observer = new PerformanceObserver(callback);
    observer.observe({ entryTypes: ["resource"] });
    return observer.disconnect;
  }, []);
  return null;
}

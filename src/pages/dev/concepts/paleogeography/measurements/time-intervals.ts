import h from "@macrostrat/hyper";
import { intervals, Interval } from "@macrostrat/timescale";
import { ascending } from "d3-array";
import { createContext, useContext } from "react";

function findMatchingIntervals(
  intervals: Interval[],
  time: number,
  minimumAgeSpan: number = 2
): Interval {
  let bestIntervals = intervals.filter(int => {
    return (
      int.eag >= time && int.lag <= time && int.eag - int.lag >= minimumAgeSpan
    );
  });
  bestIntervals.sort((a, b) => {
    return ascending(a.eag - a.lag, b.eag - b.lag);
  });
  return bestIntervals;
}

interface IntervalCtx {
  matchingIntervals: Interval[];
  bestInterval: Interval | null;
  time: number;
  minimumAgeSpan: number;
  ageRange: [number, number] | null;
}

const IntervalContext = createContext<IntervalCtx | null>(null);

export function IntervalProvider({ time, children, minimumAgeSpan = 2 }) {
  const matchingIntervals = findMatchingIntervals(
    intervals,
    time,
    minimumAgeSpan
  );
  const bestInterval: Interval = matchingIntervals[0];
  const ageRange = bestInterval?.ageRange;
  return h(
    IntervalContext.Provider,
    {
      value: {
        bestInterval: matchingIntervals[0],
        matchingIntervals,
        time,
        minimumAgeSpan,
        ageRange
      }
    },
    children
  );
}

export function useSelectedInterval() {
  return useContext(IntervalContext)?.bestInterval;
}

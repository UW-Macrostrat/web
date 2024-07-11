import { LegendItem, CorrelationItem, AgeDisplayMode } from "./types";
import { IntervalShort } from "~/components/unit-details";
import { mergeAgeRanges, AgeRange } from "@macrostrat-web/utility-functions";

export { mergeAgeRanges };

export function buildCorrelationChartData(
  legendData: LegendItem[],
  ageMode: AgeDisplayMode
): CorrelationItem[] {
  /** Build the data for a correlation chart */
  if (legendData == null) {
    return [];
  }

  let data1 = legendData
    .map((d, i) => {
      let ageRanges: AgeRange[] = [];

      if (d.b_interval != null) {
        ageRanges.push(getAgeRangeForInterval(d.b_interval));
      }
      if (d.t_interval != null) {
        ageRanges.push(getAgeRangeForInterval(d.t_interval));
      }

      if (ageRanges.length === 0) {
        return null;
      }

      let macrostratAgeRange: AgeRange | null = null;
      if (d.best_age_bottom != null && d.best_age_top != null) {
        macrostratAgeRange = [d.best_age_bottom, d.best_age_top];
      }

      return {
        details: d,
        id: d.legend_id,
        ageRange: mergeAgeRanges(ageRanges),
        macrostratAgeRange,
        frequency: i,
        color: d.color,
      };
    })
    .filter((d) => d != null) as CorrelationItem[];

  return data1.sort((a, b) =>
    intervalComparison(getBestAgeRange(a, ageMode), getBestAgeRange(b, ageMode))
  );
}

function midpointAge(range: [number, number]) {
  return (range[0] + range[1]) / 2;
}

function getAgeRangeForInterval(interval: IntervalShort): AgeRange | null {
  /** Get the age range for an interval, building up an index as we go */
  return [interval.b_age, interval.t_age];
}

function intervalComparison(a: AgeRange, b: AgeRange) {
  // If age range fully overlaps with another, put the wider one first
  return midpointAge(b) - midpointAge(a);
}

export function getBoundingAgeRange(
  item: CorrelationItem,
  ageMode: AgeDisplayMode
) {
  const bestAge = getBestAgeRange(item, ageMode);
  if (ageMode == AgeDisplayMode.Macrostrat) {
    return bestAge;
  }
  if (bestAge == item.ageRange) {
    return item.ageRange;
  } else {
    return mergeAgeRanges([item.ageRange, bestAge]);
  }
}

export function getBestAgeRange(
  item: CorrelationItem,
  ageMode: AgeDisplayMode
) {
  if (ageMode == AgeDisplayMode.MapLegend || item.macrostratAgeRange == null) {
    return item.ageRange;
  }
  return item.macrostratAgeRange;
}

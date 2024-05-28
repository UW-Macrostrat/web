import {
  DetritalSpectrumPlot,
  DetritalSeries,
  usePlotArea,
} from "@macrostrat/data-components";
import { IUnit } from "@macrostrat/column-views";
import h from "@macrostrat/hyper";
import { useAPIResult } from "@macrostrat/ui-components";
import { useColumnData } from "../column-data/provider";
import { useDetritalMeasurements, MeasurementInfo } from "./provider";

interface DetritalItemProps {
  data: MeasurementInfo[];
  unit?: IUnit;
}

function DepositionalAge({ unit }) {
  const { xScale, height } = usePlotArea();

  const { t_age, b_age } = unit;
  const x = xScale(t_age);
  const x1 = xScale(b_age);

  return h("rect.depositional-age", { x, width: x1 - x, y: 0, height });
}

function DetritalGroup(props: DetritalItemProps) {
  const { data, unit } = props;
  const { geo_unit } = data[0];

  return h("div.detrital-group", [
    h("h5.geo-unit", geo_unit),
    h(DetritalSpectrumPlot, [
      h.if(unit != null)(DepositionalAge, { unit }),
      data.map((d) => {
        return h(DetritalSeries, {
          bandwidth: 30,
          data: d.measure_value,
        });
      }),
    ]),
  ]);
}

const matchingUnit = (dz) => (d) => d.unit_id == dz[0].unit_id;

function DetritalColumn() {
  const { measurements: data, units } = useColumnData();

  if (data == null || units == null) return null;

  let dzUnitData = Array.from(data.values());
  dzUnitData.sort((a, b) => {
    const v1 = units.findIndex(matchingUnit(a));
    const v2 = units.findIndex(matchingUnit(b));
    return v1 > v2;
  });

  // group by units
  return h(
    "div.detrital-column",
    null,
    dzUnitData.map((d) => {
      const unit = units.find(matchingUnit(d));
      return h(DetritalGroup, { data: d, unit });
    })
  );
}

export { DetritalColumn, DetritalGroup, useDetritalMeasurements };

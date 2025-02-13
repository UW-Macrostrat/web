import h from "@macrostrat/hyper";
import { useState, useEffect } from "react";
import {
  useMeasurementData,
  MeasurementDataContext,
} from "@macrostrat/column-views";
import { useAPIResult } from "@macrostrat/ui-components";
import type {
  MeasurementLong,
  UnitLong,
  ColumnSpec,
} from "@macrostrat/api-types";
import {
  alignMeasurementsToTargetColumn,
  filterMeasurements,
  FilterFunc,
} from "@macrostrat/stratigraphy-utils";

/** This file defines subsidiary measurement data providers that transform
 * data requests into formats for column subsets.
 */

type MeasurementProviderProps = React.PropsWithChildren<{
  measureData?: MeasurementLong[];
}>;

function AlignedMeasurementProvider(
  props: MeasurementProviderProps & { targetColumn: ColumnSpec }
) {
  const { children, targetColumn, measureData = useMeasurementData() } = props;
  // Higher-level measurement data provider
  const unitData: UnitLong[] = useAPIResult("/units", targetColumn);

  const [data, setData] = useState<any[] | null>(null);
  useEffect(() => {
    if (measureData == null || unitData == null) return;
    const res = alignMeasurementsToTargetColumn(
      measureData,
      unitData,
      targetColumn
    );
    setData(res);
  }, [measureData, unitData]);

  return h(MeasurementDataContext.Provider, {
    value: data,
    children,
  });
}

function FilteredMeasurementProvider(
  props: MeasurementProviderProps & { filterFunc: FilterFunc }
) {
  const { children, measureData = useMeasurementData(), filterFunc } = props;

  const value = filterMeasurements(measureData ?? [], filterFunc);

  return h(MeasurementDataContext.Provider, { value, children });
}

export {
  AlignedMeasurementProvider,
  FilteredMeasurementProvider,
  useMeasurementData,
  ColumnSpec,
};

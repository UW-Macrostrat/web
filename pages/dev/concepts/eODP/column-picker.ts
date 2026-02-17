import { geoCentroid, geoStereographic, geoNaturalEarth1 } from "d3-geo";
import { ResizableMapFrame } from "@macrostrat/column-views";
import {
  ColumnKeyboardNavigation,
  ColumnFeatures,
  CurrentColumn,
} from "@macrostrat/column-views";
import { useMacrostratColumns } from "@macrostrat/data-provider";
import { useMemo, forwardRef } from "react";
import h from "./age-model.module.styl";

function useFilteredColumns({ project_id }) {
  // Filter columns by whether they contain any units
  const features = useMacrostratColumns(project_id, true);

  return useMemo(() => {
    let completedColumns = [];
    let emptyColumns = [];

    for (const col of features ?? []) {
      if (col.properties.t_units > 0) {
        completedColumns.push(col);
      } else {
        emptyColumns.push(col);
      }
    }
    return [completedColumns, emptyColumns];
  }, [features]);
}

const ColumnMapView = forwardRef((props, ref) => {
  const { currentColumn, setCurrentColumn, children, ...rest } = props;
  const center = geoCentroid(currentColumn);

  const { project_id, color } = props;

  const col_id = currentColumn?.properties?.col_id;

  const [completedColumns, emptyColumns] = useFilteredColumns({
    apiRoute,
    status_code,
    project_id,
  });

  let keyboardNavColumns = [
    ...completedColumns,
    // Add the current column to keyboard navigation so that we can navigate
    // away from incomplete columns if we have them selected
    ...emptyColumns.filter((d) => d.properties.col_id == col_id),
  ];

  return h("div.column-map-container", { ref }, [
    h(
      ResizableMapFrame,
      {
        center,
        className: "column-map",
        ...rest,
      },
      [
        h(ColumnKeyboardNavigation, {
          features: keyboardNavColumns,
          col_id,
          onChange: setCurrentColumn,
          status_code,
          project_id,
          showLayers: false,
        }),
        h(ColumnFeatures, {
          features: emptyColumns,
          color: "#888",
          onClick: setCurrentColumn,
        }),
        h(ColumnFeatures, {
          features: completedColumns,
          onClick: setCurrentColumn,
          color,
        }),
        h.if(currentColumn != null)(CurrentColumn, {
          feature: currentColumn,
        }),
      ]
    ),
    children,
  ]);
});

export default ColumnMapView;

import hyper from "@macrostrat/hyper";
import {
  ColumnSurfaces,
  IsotopesColumn,
  MeasurementDataProvider,
  type SurfaceStatus,
  TIE_POINT_STATUSES,
} from "@macrostrat/column-views";
import { MacrostratInteractionProvider } from "@macrostrat/data-components";
import { useShowAllSurfaces } from "./state";
import styles from "./index.module.sass";

const h = hyper.styled(styles);

export function StableIsotopesColumn({ columnID }) {
  return h(
    "div.isotopes-column",
    h(MeasurementDataProvider, { col_id: columnID }, [
      h(IsotopesColumn, {
        parameter: "D13C",
        label: "δ¹³C",
        color: "dodgeblue",
        domain: [-14, 6],
        width: 100,
        nTicks: 4,
      }),
      h(IsotopesColumn, {
        parameter: "D18O",
        label: "δ¹⁸O",
        color: "red",
        domain: [-40, 0],
        width: 100,
        nTicks: 4,
      }),
    ])
  );
}

/** The age model's surfaces over the column: its tie points, or every surface.
 * Must be a direct child of `Column`, which it measures to place its lines. */
export function AgeModelSurfaces() {
  const showAll = useShowAllSurfaces();
  let statuses: SurfaceStatus[] | null = TIE_POINT_STATUSES;
  if (showAll) statuses = null;
  return h(
    MacrostratInteractionProvider,
    // Interval tags select their surface instead of linking to the lexicon
    { inherit: false },
    h(ColumnSurfaces, { statuses })
  );
}

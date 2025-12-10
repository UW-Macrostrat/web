import hyper from "@macrostrat/hyper";
import {
  IsotopesColumn,
  MeasurementDataProvider,
} from "@macrostrat/column-views";
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

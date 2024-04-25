import hyper from "@macrostrat/hyper";
import { ColorPicker } from "@macrostrat/data-sheet";
import { Cell } from "@blueprintjs/table";
import { useInDarkMode } from "@macrostrat/ui-components";
import { useMemo } from "react";
import chroma from "chroma-js";
import styles from "./main.module.sass";
import "@blueprintjs/table/lib/css/table.css";
import DataSheet from "@macrostrat/data-sheet2";

const h = hyper.styled(styles);

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args

// TODO: add a "copy to selection" tool (the little square in the bottom right corner of a cell)
// This should copy the value of a cell (or a set of cells in the same row) downwards.

export default function DataSheetTest() {
  const darkMode = useInDarkMode();
  const columnSpec = buildColumnSpec(darkMode);
  const data = useMemo(buildTestData, []);

  return h(DataSheet, { data, columnSpec });
}

function valueRenderer(d) {
  try {
    return d.toFixed(2);
  } catch (e) {
    return `${d}`;
  }
}

function buildColumnSpec() {
  return [
    { name: "Strike", key: "strike", valueRenderer },
    { name: "Dip", key: "dip", valueRenderer },
    { name: "Rake", key: "rake", valueRenderer },
    { name: "Max.", key: "maxError", category: "Errors", valueRenderer },
    { name: "Min.", key: "minError", category: "Errors", valueRenderer },
    {
      name: "Color",
      key: "color",
      required: false,
      isValid: (d) => true, //getColor(d) != null,
      transform: (d) => d,
      dataEditor: ColorPicker,
      valueRenderer: (d) => {
        let color = d;
        try {
          color = chroma(d);
        } catch (e) {
          color = null;
        }
        return color?.name() ?? "";
      },
      // Maybe this should be changed to CellProps?
      cellComponent: ColorCell,
    },
  ];
}

function ColorCell({ value, children, style, intent, ...rest }) {
  const brighten = useInDarkMode() ? 0.5 : 0.1;
  const color = value;
  return h(
    Cell,
    {
      ...rest,
      style: {
        ...style,
        color: color?.luminance?.(brighten).css(),
        backgroundColor: color?.alpha?.(0.2).css(),
      },
    },
    children
  );
}

function buildTestData() {
  const repeatedData = [];

  for (const i of Array(5000).keys()) {
    const errors = [4 + Math.random() * 10, 2 + Math.random() * 10];
    repeatedData.push({
      color: chroma.mix(
        "red",
        "blue",
        (Math.random() + Math.abs((i % 20) - 10)) / 10,
        "rgb"
      ),
      strike: 10 + Math.random() * 10,
      dip: 5 + Math.random() * 10,
      rake: 20 + Math.random() * 10,
      maxError: Math.max(...errors),
      minError: Math.min(...errors),
    });
  }
  return repeatedData;
}

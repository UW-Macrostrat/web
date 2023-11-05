import hyper from "@macrostrat/hyper";
import { DataSheet, ColorEditor } from "@macrostrat/data-sheet";
import { useState } from "react";
import chroma from "chroma-js";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args

export default function DataSheetTestPage() {
  return h("div.main", [h("h1", "Data sheet test"), h(DataSheetTest)]);
}

function DataSheetTest() {
  const [data, setData] = useState(buildTestData());
  return h(DataSheet, {
    columns: columnSpec,
    virtualized: true,
    height: 500,
    data: data,
    valueRenderer: (d) => {
      try {
        return d.value.toFixed(2);
      } catch (e) {
        return `${d.value}`;
      }
    },
  });
}
const columnSpec = [
  { name: "Strike", key: "strike" },
  { name: "Dip", key: "dip" },
  { name: "Rake", key: "rake" },
  { name: "Max.", key: "maxError", category: "Errors" },
  { name: "Min.", key: "minError", category: "Errors" },
  {
    name: "Color",
    key: "color",
    required: false,
    isValid: (d) => true, //getColor(d) != null,
    transform: (d) => d,
    dataEditor: ColorEditor,
    valueViewer(d) {
      let color = d.value;
      try {
        color.hex();
      } catch (e) {
        color = null;
      }
      return h(
        "span.value-viewer",
        {
          style: {
            color: color?.css(),
            backgroundColor: color?.luminance(0.8).css(),
          },
        },
        color?.hex()
      );
    },
  },
];

const cscale = chroma.scale("Spectral");

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

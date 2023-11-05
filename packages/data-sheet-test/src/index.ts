import hyper from "@macrostrat/hyper";
import { ColorPicker, EditorPopup } from "@macrostrat/data-sheet";
import { HotkeysProvider, useHotkeys, InputGroup } from "@blueprintjs/core";
import {
  Column,
  Table2,
  Cell,
  FocusedCellCoordinates,
} from "@blueprintjs/table";
import { useInDarkMode } from "@macrostrat/ui-components";
import { useMemo, useState, useRef, useCallback } from "react";
import chroma from "chroma-js";
import update from "immutability-helper";
import styles from "./main.module.sass";
import "@blueprintjs/table/lib/css/table.css";

const h = hyper.styled(styles);

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args

export default function DataSheetTestPage() {
  return h(
    HotkeysProvider,
    h("div.main", [
      h("h1", "Data sheet test"),
      h("div.data-sheet-container", h(DataSheetTest)),
    ])
  );
}

function DataSheetTest() {
  const darkMode = useInDarkMode();
  const columnSpec = buildColumnSpec(darkMode);

  const [focusedCell, setFocusedCell] = useState<FocusedCellCoordinates>(null);

  const ref = useRef<HTMLDivElement>(null);

  const data = useMemo(buildTestData, []);

  // A sparse array to hold updates
  const [updatedData, setUpdatedData] = useState([]);
  const onCellEdited = useCallback(
    (row: number, key: string, value: any) => {
      let rowSpec = {};
      if (value != null) {
        const rowOp = updatedData[row] != null ? "$merge" : "$set";
        rowSpec = { [rowOp]: { [key]: value } };
      } else {
        rowSpec = { $unset: [key] };
      }
      const spec = { [row]: rowSpec };
      setUpdatedData(update(updatedData, spec));
    },
    [setUpdatedData, updatedData]
  );

  return h(
    Table2,
    {
      ref,
      numRows: data.length,
      className: "data-sheet",
      enableFocusedCell: true,
      focusedCell,
      onFocusedCell(cell) {
        setFocusedCell(cell);
      },
      cellRendererDependencies: [focusedCell, updatedData],
    },
    columnSpec.map((col, colIndex) => {
      return h(Column, {
        name: col.name,
        cellRenderer: (rowIndex) => {
          const value =
            updatedData[rowIndex]?.[col.key] ?? data[rowIndex][col.key];
          const valueRenderer = col.valueRenderer ?? ((d) => d);
          const focused =
            focusedCell?.col === colIndex && focusedCell?.row === rowIndex;

          const edited = updatedData[rowIndex]?.[col.key] != null;
          const intent = edited ? "success" : undefined;
          const renderer =
            col.cellRenderer ??
            ((d) =>
              h(
                Cell,
                {
                  intent,
                },
                valueRenderer(d)
              ));

          if (!focused) {
            // This should be the case for every cell except the focused one
            return renderer(value);
          }

          const onChange = (e) => {
            const value = e.target.value;
            onCellEdited(rowIndex, col.key, value);
          };

          if (col.dataEditor != null) {
            return h(
              Cell,
              { interactive: true, intent },
              h(
                EditorPopup,
                {
                  content: h(col.dataEditor, {
                    value,
                    onChange,
                  }),
                },
                valueRenderer(value)
              )
            );
          }

          // Hidden html input
          return h(
            Cell,
            {
              interactive: true,
              intent,
              className: "input-container",
              truncated: true,
            },
            [
              h("input", {
                value: valueRenderer(value),
                autoFocus: true,
                onChange,
              }),
            ]
          );
        },
      });
    })
  );
}

function valueRenderer(d) {
  try {
    return d.toFixed(2);
  } catch (e) {
    return `${d}`;
  }
}

function buildColumnSpec(inDarkMode: boolean) {
  const brighten = inDarkMode ? 0.5 : 0.1;

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
        return color?.hex();
      },
      cellRenderer(data) {
        let color = data;
        return h(
          Cell,
          {
            style: {
              color: color?.luminance(brighten).css(),
              backgroundColor: color?.alpha(0.2).css(),
            },
          },
          color?.hex()
        );
      },
    },
  ];
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

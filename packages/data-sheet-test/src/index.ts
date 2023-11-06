import hyper from "@macrostrat/hyper";
import { ColorPicker, EditorPopup } from "@macrostrat/data-sheet";
import { HotkeysProvider, useHotkeys, InputGroup } from "@blueprintjs/core";
import {
  Column,
  Table2,
  Cell,
  FocusedCellCoordinates,
  Region,
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
      h("p", [
        "This is a test of the a spreadsheet-like editor based on the ",
        h("code", "@blueprintjs/core"),
        " component. It will eventually be used as the basis for the ",
        h("code", "@macrostrat/data-sheet"),
        " library, which will underpin several important Macrostrat v2 user interfaces.",
      ]),
      h("div.data-sheet-container", h(DataSheetTest)),
    ])
  );
}

// TODO: add a "copy to selection" tool (the little square in the bottom right corner of a cell)
// This should copy the value of a cell (or a set of cells in the same row) downwards.

function DataSheetTest() {
  const darkMode = useInDarkMode();
  const columnSpec = buildColumnSpec(darkMode);

  // For now, we only consider a single cell "focused" when we have one cell selected.
  // Multi-cell selections have a different set of "bulk" actions.
  //const [focusedCell, setFocusedCell] = useState<FocusedCellCoordinates>(null);
  const [selection, setSelection] = useState<Region[]>(null);
  const _topLeftCell = useMemo(() => topLeftCell(selection), [selection]);
  const focusedCell = useMemo(() => singleFocusedCell(selection), [selection]);

  const ref = useRef<HTMLDivElement>(null);

  const data = useMemo(buildTestData, []);

  // A sparse array to hold updates
  // TODO: create a "changeset" concept to facilitate undo/redo
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

  const clearSelection = useCallback(() => {
    // Delete all selected cells
    let spec = {};
    console.log(selection);
    for (const region of selection) {
      const { cols, rows } = region;
      for (const row of range(rows)) {
        let vals = {};
        for (const col of range(cols)) {
          const key = columnSpec[col].key;
          vals[key] = "";
        }
        let op = updatedData[row] == null ? "$set" : "$merge";
        spec[row] = { [op]: vals };
      }
    }
    console.log(spec);
    setUpdatedData(update(updatedData, spec));
  }, [selection, updatedData, columnSpec]);

  return h(
    Table2,
    {
      ref,
      numRows: data.length,
      className: "data-sheet",
      //enableFocusedCell: true,
      //focusedCell,
      onSelection(val: Region[]) {
        console.log(val);
        setSelection(val);
      },
      cellRendererDependencies: [selection, updatedData],
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
          // Top left cell of a ranged selection
          const topLeft =
            _topLeftCell?.col === colIndex && _topLeftCell?.row === rowIndex;

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

          if (!topLeft) {
            // This should be the case for every cell except the focused one
            return renderer(value);
          }

          if (!focused) {
            // This should be the case for the focused cell
            // Selection
            return h(Cell, { interactive: true, intent }, [
              h("input.hidden-input", {
                autoFocus: true,
                onKeyDown(e) {
                  console.log(e.key);
                  if (e.key == "Backspace" || e.key == "Delete") {
                    clearSelection();
                  }
                  e.preventDefault();
                },
              }),
              valueRenderer(value),
            ]);
            // Could probably put the hidden input elsewhere,
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

function range(arr: number[]) {
  if (arr.length != 2) throw new Error("Range must have two elements");
  const [start, end] = arr;
  return Array.from({ length: end - start + 1 }, (_, i) => i + start);
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
              color: color?.luminance?.(brighten).css(),
              backgroundColor: color?.alpha?.(0.2).css(),
            },
          },
          color?.hex?.() ?? ""
        );
      },
    },
  ];
}

function topLeftCell(
  regions: Region[],
  requireSolitaryCell: boolean = false
): FocusedCellCoordinates | null {
  /** Top left cell of a ranged selection  */
  if (regions == null) return null;
  const [region] = regions;
  if (region == null) return null;
  const { cols, rows } = region;
  if (cols == null || rows == null) return null;
  if (requireSolitaryCell && (cols[0] !== cols[1] || rows[0] !== rows[1]))
    return null;
  return { col: cols[0], row: rows[0], focusSelectionIndex: 0 };
}

function singleFocusedCell(sel: Region[]): FocusedCellCoordinates | null {
  /** Derive a single focused cell from a selected region, if possible */
  if (sel?.length !== 1) return null;
  return topLeftCell(sel, true);
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

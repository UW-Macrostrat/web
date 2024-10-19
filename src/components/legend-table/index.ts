import { OverlayToaster, Tag } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import DataSheet, { ColorCell } from "@macrostrat/data-sheet2";
import { LithologyTag } from "~/components";
import { usePostgRESTLazyLoader } from "~/components/legend-table/data-loaders";
import { HotkeysProvider } from "@blueprintjs/core";
import { Spinner } from "@blueprintjs/core";

export * from "./data-loaders";
import { postgrest } from "~/_providers";
import { useRef } from "react";
import { ErrorBoundary } from "@macrostrat/ui-components";

const h = hyper.styled(styles);

interface PostgRESTTableViewProps {
  table: string;
  columnOptions?: any;
  order?: any;
  columns?: string;
  editable?: boolean;
}

export function PostgRESTTableView(props: PostgRESTTableViewProps) {
  return h(ErrorBoundary, h(_PostgRESTTableView, props));
}

export function _PostgRESTTableView({
  table,
  columnOptions,
  order,
  columns,
  editable = false,
}: PostgRESTTableViewProps) {
  const { data, onScroll, dispatch } = usePostgRESTLazyLoader(table, {
    order,
    columns,
  });

  const toasterRef = useRef(null);

  if (data == null) {
    return h(Spinner);
  }

  return h(
    "div.data-sheet-container",
    h(HotkeysProvider, [
      h(OverlayToaster, { usePortal: false, ref: toasterRef }),
      h(DataSheet, {
        data,
        columnSpecOptions: columnOptions ?? {},
        editable,
        onVisibleCellsChange(visibleCells) {
          onScroll(visibleCells);
        },
        onSaveData(updates, data) {
          if (!editable) return;

          // Augment updates with primary key
          let newUpdates: Map<number, any> = new Map(
            Object.entries(updates).map(([key, update]) => {
              return [key, { ...data[key], ...update }];
            })
          );

          let updateRows = Array.from(newUpdates.values());

          dispatch({ type: "start-loading" });

          // Save data
          postgrest
            .from(table)
            .upsert(updateRows)
            .then((res) => {
              if (res.status != 200) {
                // Throw an error with the status code
                let err = new Error(res.error.message);
                err["status"] = res.status;
                throw err;
              }

              // Merge new data with old data
              dispatch({ type: "update-data", data: newUpdates });
            })
            .catch((err: Error) => {
              const status = err["status"];
              toasterRef.current.show({
                message: h([
                  h.if(status != null)([h("code", status), " "]),
                  err.message,
                ]),
                intent: "danger",
              });
            });
        },
      }),
    ])
  );
}

export function LongTextViewer({ value, onChange }) {
  return h("div.long-text", value);
}

export function IntervalCell({ value, children, ...rest }) {
  return h(ColorCell, { value: value?.color, ...rest }, value?.name);
}

export function lithologyRenderer(value) {
  return h("span.liths", [
    addJoiner(value?.map((d) => h(LithologyTag, { data: d }))),
  ]);
}

export function ExpandedLithologies({ value, onChange }) {
  if (value == null) return h("div.basis-panel", "No lithologies");
  return h("div.basis-panel", [
    h("table", [
      h("thead", h("tr", [h("th", "Lithology"), h("th", "Source")])),
      h(
        "tbody",
        value.map((d) => {
          return h("tr", { key: d.id }, [
            h("td", h(LithologyTag, { data: d })),
            h(
              "td.basis-col",
              d.basis_col?.map((d) => {
                return h(Tag, { minimal: true, key: d }, [
                  h("span.tag-header", "Column"),
                  " ",
                  h("code", d),
                ]);
              })
            ),
          ]);
        })
      ),
    ]),
  ]);
}

function addJoiner(arr) {
  return arr?.reduce((acc, curr) => [acc, " ", curr]);
}

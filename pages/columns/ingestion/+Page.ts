import h from "@macrostrat/hyper";
import { useCallback } from "react";
import { navigate } from "vike/client/router";
import { ColumnMapSlot } from "~/components/column-map/target";
import { editorHref } from "../../dev/column-editor-2/data";
import { ColumnUpload } from "./column-upload";

/**
 * Column ingestion page (`/columns/ingestion`).
 *
 * Admin/web_user only (see `+guard.ts`). Parallels the map ingestion flow at
 * `/maps/ingestion`: upload a column spreadsheet, which the api-v3
 * `/columns/ingest` endpoint hands to a Celery worker.
 *
 * Below the upload box it also nests the column-editor picker map (the shared
 * persistent map the `/columns` subtree keeps warm). Clicking a column opens it
 * in the column editor at `/dev/column-editor-2/edit/<id>`.
 */

// Stable empty array so the slot doesn't re-target every render.
const NO_SELECTION: number[] = [];

export function Page() {
  const onSelectColumn = useCallback((colID: number | null) => {
    if (colID == null) return;
    navigate(editorHref(colID));
  }, []);

  return h(
    "div.column-ingestion",
    { style: { padding: "1rem", maxWidth: "48rem" } },
    [
      h("h1", "Column ingestion"),
      h(
        "p",
        "Upload a column spreadsheet (.xlsx) to ingest into Macrostrat. " +
          "Keep dry run on to validate a file without saving anything."
      ),
      h(ColumnUpload),
      h("h2", { style: { marginTop: "1.5rem" } }, "Edit an existing column"),
      h("p", "Click a column on the map to open it in the column editor."),
      h(
        "div.column-picker-map",
        {
          style: {
            position: "relative",
            width: "100%",
            height: "500px",
            marginTop: "0.5rem",
          },
        },
        h(ColumnMapSlot, {
          targetKey: "column-ingestion-picker:core",
          projectID: null,
          inProcess: true,
          visibleColumnIDs: null,
          selectedColumnIDs: NO_SELECTION,
          selectedColumn: null,
          onSelectColumn,
        })
      ),
    ]
  );
}

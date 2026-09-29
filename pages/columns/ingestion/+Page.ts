import h from "@macrostrat/hyper";
import { ColumnUpload } from "./column-upload";

/**
 * Column ingestion page (`/columns/ingestion`).
 *
 * Admin-only (see `+guard.ts`). Parallels the map ingestion flow at
 * `/maps/ingestion`: upload a column spreadsheet, which the api-v3
 * `/columns/ingest` endpoint hands to a Celery worker.
 */
export function Page() {
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
    ]
  );
}

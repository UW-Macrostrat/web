/** The editor's state, apart from its views.
 *
 * - `column` — the loaded column and the transaction over it
 * - `structure` — adding, splitting and removing units
 * - `draft` — a new column's surfaces, which are records
 * - `editing` — what a sheet's cell edits mean
 * - `focus` — the age window the column and the tables are narrowed to
 * - `options` — display and editing settings
 * - `surfaces` — the surfaces projection of the transaction
 * - `view` — mode, selection and pane visibility
 * - `intervals` — interval definitions for chronostratigraphic edits
 * - `ingest` — the ingestion pipeline's notices, and the facies scheme
 * - `ctx` — the editor's isolated jotai hooks; `session` — the per-column store
 * - `metadata` — the column's own fields; `location` — where it is
 * - `presentation` — what a cell's value *is* (a record, a restatement, a
 *   modeled age), read by the sheets to draw it accordingly
 */
export * from "./ctx";
export * from "./column";
export * from "./draft";
export * from "./editing";
export * from "./focus";
export * from "./ingest";
export * from "./intervals";
export * from "./options";
export * from "./presentation";
export * from "./structure";
export * from "./surfaces";
export * from "./view";
export * from "./session";
export * from "./metadata";
export * from "./location";

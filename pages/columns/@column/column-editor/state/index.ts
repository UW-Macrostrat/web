/** The editor's state, apart from its views.
 *
 * - `column` — the loaded column and the transaction over it
 * - `editing` — what a sheet's cell edits mean
 * - `focus` — the age window the column and the tables are narrowed to
 * - `options` — display and editing settings
 * - `surfaces` — the surfaces projection of the transaction
 * - `view` — mode, selection and pane visibility
 * - `intervals` — interval definitions for chronostratigraphic edits
 * - `presentation` — what a cell's value *is* (a record, a restatement, a
 *   modeled age), read by the sheets to draw it accordingly
 */
export * from "./column";
export * from "./editing";
export * from "./focus";
export * from "./intervals";
export * from "./options";
export * from "./presentation";
export * from "./surfaces";
export * from "./view";

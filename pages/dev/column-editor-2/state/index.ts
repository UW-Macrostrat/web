/** The editor's state, apart from its views.
 *
 * - `column` — the loaded column and the transaction over it
 * - `editing` — what a sheet's cell edits mean
 * - `options` — display and editing settings
 * - `surfaces` — the surfaces projection of the transaction
 * - `view` — mode, selection and pane visibility
 * - `intervals` — interval definitions for chronostratigraphic edits
 */
export * from "./column";
export * from "./editing";
export * from "./intervals";
export * from "./options";
export * from "./surfaces";
export * from "./view";

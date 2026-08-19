# Ingestion table — clipboard & fill-handle behavior

Notes on how copy/cut/paste and the fill-handle drag are wired for the ingestion
data sheet, and why the app carries workarounds for them.

The table is `@macrostrat/data-sheet`'s `<DataSheet>`. That package resolves to
its **published dist** (see the repo `AGENTS.md`) — editing the web-components
source has no effect here until it's released and the version bumped. So any gap
in the library's behavior has to be patched app-side, in these two files:

- `tables/actions.ts` — the toolbar/hotkey `TableAction`s (copy/cut/paste).
- `tables/edit-table.ts` — the `<DataSheet>` wrapper (`TableInterface`) and the
  in-provider sync helpers (`StoreSync`, `ViewStateSync`, `FillCapture`).

## How an edit becomes a saved change

Edits are **not** written to the server directly. They flow through a
pending-ops stack (`opsAtom` in `tables/pending-ops.ts`):

1. The library emits an `onEdit` event for a change.
2. `handleEdit` (in `edit-table.ts`) turns each `setCells` event into `setCell`
   ops appended to `opsAtom` (with noop/revert handling — retyping the original
   value drops the op).
3. The visible overlay is a pure derivation of the ops (`deriveOverlay` →
   `applyOps`).
4. **Save** (`saveAction` in `actions.ts`) flushes `opsAtom` to the API.

The consequence: **any edit path that does not fire `onEdit` produces no op, so
Save silently does nothing.** Both workarounds below exist because a library
edit path skipped `onEdit`.

## Clipboard (copy / cut / paste)

`enableClipboard: false` is set on `<DataSheet>` so the library's built-in
clipboard hotkeys don't double up; the copy/cut/paste actions are provided by
this app as hotkey-only `TableAction`s (`targets: []`).

**Why the app owns paste.** The library's paste calls
`navigator.clipboard.readText()`. Chrome allows clipboard *writes* on a user
gesture (so copy works) but requires an explicit `clipboard-read` permission
grant for reads; without it, `readText()` throws
`Failed to execute 'readText' on 'Clipboard': Read permission denied`. That made
copy → paste between cells fail.

The app-side design:

- **Copy / cut** (`captureSelection`) serialize the selection to TSV, stash it in
  a module-scoped `inAppClipboard` buffer, and *also* best-effort-write it to the
  system clipboard (for pasting into other apps). The buffer is the fallback that
  makes an in-sheet paste work regardless of the read permission.
- **Paste** (`pasteHijack`) resolves its text as: try `readText()` first (so
  pastes from other apps work); if the browser blocks the read, fall back to the
  `inAppClipboard` buffer.
- **Whole-column copy** is special-cased *before* reading any text: copying a full
  column and pasting onto other full column(s) appends a `setColumn` copy op — a
  revertible rule that becomes a server-side copy on Save, scoped to the current
  filtered view. Everything else builds cell edits and calls `ctx.editCells`
  (which fires `onEdit`).

**Paste tiling** (`buildPasteEdits`) reimplements the library's Excel-style paste
shape logic (the library's `buildPasteEdits` is not exported) so we can paste
from our own text buffer:

- single-cell selection → expand from the anchor to fit the data, clipped at the
  table edge;
- selection matching or smaller than the data → fill the selection, tiling the
  data via modulo;
- selection larger than the data → clip to the data extent.

## Fill handle (crosshair drag)

Dragging the crosshair from a cell's bottom-right corner copies its value across
adjacent cells. The library applies this through `onSelection` → `fillValues`,
writing its overlay **without firing `onEdit`** — so, before the fix, the fill
rendered on screen but produced no op and Save did nothing.

`FillCapture` (in `edit-table.ts`) bridges the gap. A fill drag leaves the
library's `fillValueBaseCell` anchor set (it's only cleared on a single-cell
selection), so on the `mouseup` that ends the drag, `FillCapture`:

1. reads the anchor cell's filled value and the rows the selection spans;
2. re-emits them as the same `{ type: "setCells" }` `onEdit` event an inline edit
   would produce (reusing `handleEdit`, so noop/revert handling is shared);
3. clears the anchor so a later plain `mouseup` can't re-capture the same fill.

The handler early-returns unless an anchor is set, so ordinary clicks and
drag-selections are unaffected.

## Upstream follow-up

Both workarounds exist because the published `@macrostrat/data-sheet` omits an
`onEdit` on an edit path. The durable fix is upstream: have `fillValues` fire
`onEdit` like the other store mutators, and let paste read from a proxy/buffer
instead of requiring `clipboard-read`. Until that ships and the version is
bumped here, the app-side patches above are load-bearing.

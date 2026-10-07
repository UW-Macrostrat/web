/** The editor's own jotai scope.
 *
 * The editor's atoms live in an *editing session* — one store per column,
 * held across the overview, units and location pages so a column can be
 * saved or reverted in one go (`./session`). Each page sits in its own
 * `HybridPage`, which creates a jotai provider of its own, so the editor's
 * hooks cannot be jotai's: they would resolve in whichever frame is nearest.
 * `createIsolation` gives hooks bound to their own provider, which the column
 * layout mounts with the session's store. Every editor module imports its
 * hooks from here, and `atom` from jotai as usual. */
import { createIsolation } from "jotai-scope";

export const editorCtx = createIsolation();

export const { useAtom, useAtomValue, useSetAtom, useStore } = editorCtx;
export const EditorScopeProvider = editorCtx.Provider;

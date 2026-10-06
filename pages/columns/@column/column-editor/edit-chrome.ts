/** The chrome every editing page shares: the title's context (what this is,
 * whether anything is unsaved), the tabs between the pages, and the actions
 * on the whole session — Reset all, Check, Write — which act on everything
 * the session holds, not just the page showing. */
import hyper from "@macrostrat/hyper";
import { AnchorButton, Button, ButtonGroup, Tag } from "@blueprintjs/core";
import { AlphaTag } from "~/components";
import { editorHref, locationHref, unitsEditorHref } from "./data";
import { IngestActions } from "./ingest-actions";
import {
  isDirtyAtom,
  isLocationDirtyAtom,
  isMetadataDirtyAtom,
  resetEditsAtom,
  resetLocationAtom,
  resetMetadataAtom,
  snapshotAtom,
  useAtomValue,
  useSetAtom,
} from "./state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export type EditPage = "overview" | "units" | "location";

/** Whether anything in the session differs from the loaded column. */
export function useSessionDirty(): boolean {
  const units = useAtomValue(isDirtyAtom);
  const metadata = useAtomValue(isMetadataDirtyAtom);
  const location = useAtomValue(isLocationDirtyAtom);
  return units || metadata || location;
}

/** Discard every change in the session. */
export function useResetSession(): () => void {
  const resetUnits = useSetAtom(resetEditsAtom);
  const resetMetadata = useSetAtom(resetMetadataAtom);
  const resetLocation = useSetAtom(resetLocationAtom);
  return () => {
    resetUnits();
    resetMetadata();
    resetLocation();
  };
}

/** Beside the title: the editor's warning and the column's unsaved state. */
export function EditTitleContext() {
  const snapshot = useAtomValue(snapshotAtom);
  const dirty = useSessionDirty();

  let draftTag = null;
  if (snapshot?.isDraft) {
    draftTag = h(Tag, { intent: "warning", minimal: true, className: "draft-tag" }, "Unsaved column");
  } else if (snapshot?.source === "dry-run") {
    draftTag = h(
      Tag,
      {
        intent: "warning",
        minimal: true,
        className: "draft-tag",
        title:
          "Opened from a dry run of the ingestion pipeline: this is what the database would hold, but nothing was written",
      },
      "Unsaved column (dry run)"
    );
  }

  return h("span.editor-context", [
    h(AlphaTag, {
      content:
        "An experimental editor. Edits stay in the page until written through the ingestion pipeline; reset discards them.",
    }),
    draftTag,
    h.if(dirty)("span.dirty-indicator", "Unsaved edits"),
  ]);
}

/** The pages of the editor as tabs, and the session's actions. A draft
 * column has no routes of its own, so its tabs are left out. */
export function EditChrome({ current }: { current: EditPage }) {
  const snapshot = useAtomValue(snapshotAtom);
  const dirty = useSessionDirty();
  const resetAll = useResetSession();
  const col_id = snapshot?.col_id ?? null;

  let tabs = null;
  if (col_id != null) {
    const tab = (page: EditPage, icon: string, text: string, href: string) =>
      h(AnchorButton, {
        icon,
        text,
        small: true,
        minimal: true,
        active: current === page,
        href,
      });
    tabs = h(ButtonGroup, { minimal: true, className: "edit-tabs" }, [
      tab("overview", "properties", "Overview", editorHref(col_id)),
      tab("units", "th", "Units", unitsEditorHref(col_id)),
      tab("location", "map-marker", "Location", locationHref(col_id)),
    ]);
  }

  return h("span.edit-chrome", [
    tabs,
    h(ButtonGroup, { minimal: true }, [
      h(Button, {
        icon: "reset",
        text: "Reset all",
        small: true,
        disabled: !dirty,
        title: "Discard every unsaved change to this column",
        onClick: resetAll,
      }),
      h(IngestActions),
    ]),
  ]);
}

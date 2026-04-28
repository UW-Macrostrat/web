import { Alert } from "@blueprintjs/core";import { useCallback, useState } from "react";

import { postgrestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import AddButton from "../components/AddButton";
import Tag from "./Tag";
import styles from "./ingest-process-card.module.sass";

const h = hyper.styled(styles);

const deleteTag = async (tag: string, ingestId: number) => {
  const response = await fetch(
    `${postgrestPrefix}/map_ingest_tags?ingest_process_id=eq.${ingestId}&tag=eq.${encodeURIComponent(
      tag
    )}`,
    {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (response.ok) {
    return;
  } else {
    console.log("error", response);
  }
};

export function IngestTagDisplay({
  ingestProcess,
  onUpdate,
}: {
  ingestProcess: IngestProcess;
  onUpdate: () => void;
}) {
  const [_ingestProcess, setIngestProcess] =
    useState<IngestProcess>(ingestProcess);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const updateIngestProcess = useCallback(async () => {
    const response = await fetch(
      `${postgrestPrefix}/map_ingest?id=eq.${ingestProcess.id}`
    );
    const data = await response.json();
    setIngestProcess(data[0]);
    onUpdate();
  }, []);
  const { id } = _ingestProcess;
  const tags = _ingestProcess.tags ?? [];

  const confirmDeleteTag = useCallback(async () => {
    if (tagToDelete == null) return;
    await deleteTag(tagToDelete, id);
    await updateIngestProcess();
    setTagToDelete(null);
  }, [tagToDelete, id, updateIngestProcess]);


  return h(
    "div.flex.row",
    {
      style: {
      paddingBottom: "4px",
      display: "flex",
      flexWrap: "wrap",
      gap: "0.5em",
      alignItems: "center",
      maxWidth: "100%",
      },
    },
    [
      h.if(_ingestProcess.state !== undefined)(
        Tag,
        {
          value: _ingestProcess.state,
          style: { marginTop: "auto", marginBottom: "auto" },
        },
        []
      ),
     tags.map((t) => {
        const tag = typeof t === "string" ? t : t.tag;

        return h(Tag, {
          key: tag,
          value: tag,
          style: { marginTop: "auto", marginBottom: "auto" },
          onRemove: () => {
            setTagToDelete(tag);
          },
        });
      }),
      h(
        AddButton,
        {
          ingestId: id,
          onChange: updateIngestProcess,
        },
        []
      ),
      h(Alert, {
        isOpen: tagToDelete != null,
        intent: "danger",
        icon: "trash",
        confirmButtonText: "Delete tag",
        cancelButtonText: "Cancel",
        onConfirm: confirmDeleteTag,
        onCancel: () => setTagToDelete(null),
      }, [
        h("p", [
          "Are you sure you want to delete the tag ",
          h("strong", tagToDelete ?? ""),
          "?",
        ]),
      ]),
    ]
  );
}

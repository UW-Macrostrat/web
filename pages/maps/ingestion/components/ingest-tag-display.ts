import { Alert } from "@blueprintjs/core";
import { useCallback, useEffect, useState } from "react";
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
  if (!response.ok) {
    const text = await response.text();
    console.error("Failed to delete tag", response.status, text);
    return false;
  }
  return true;
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
  const { id } = _ingestProcess;
  const tags = _ingestProcess.tags ?? [];


  const updateIngestProcess = useCallback(async () => {
    const ingestResponse = await fetch(
      `${postgrestPrefix}/map_ingest?id=eq.${ingestProcess.id}`
    );
    if (!ingestResponse.ok) {
      const text = await ingestResponse.text();
      console.error("Failed to fetch ingest process", ingestResponse.status, text);
      return;
    }
    const ingestRows = await ingestResponse.json();
    const updatedIngestProcess = ingestRows[0];
    if (updatedIngestProcess == null) return;
    const tagResponse = await fetch(
      `${postgrestPrefix}/map_ingest_tags?ingest_process_id=eq.${ingestProcess.id}`
    );
    if (!tagResponse.ok) {
      const text = await tagResponse.text();
      console.error("Failed to fetch ingest tags", tagResponse.status, text);
      return;
    }
    const tagRows: { ingest_process_id: number; tag: string }[] =
      await tagResponse.json();
    setIngestProcess({
      ...updatedIngestProcess,
      tags: tagRows.map((row) => row.tag),
    });
  }, [ingestProcess.id]);


  useEffect(() => {
    updateIngestProcess();
  }, [updateIngestProcess]);


  const confirmDeleteTag = useCallback(async () => {
    if (tagToDelete == null) return;

    const deleted = await deleteTag(tagToDelete, id);
    if (!deleted) return;

    await updateIngestProcess();
    onUpdate();
    setTagToDelete(null);
  }, [tagToDelete, id, updateIngestProcess, onUpdate]);


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
          onChange: async () => {
            await updateIngestProcess();
            onUpdate();
          },
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

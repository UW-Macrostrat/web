import { Card, AnchorButton } from "@blueprintjs/core";
import { useCallback, useState } from "react";

import { ingestPGPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import AddButton from "../components/AddButton";
import Tag from "./Tag";
import styles from "./ingest-process-card.module.sass";

const h = hyper.styled(styles);

const deleteTag = async (tag: string, ingestId: number) => {
  const response = await fetch(
    `${ingestPGPrefix}/map_ingest_tags?ingest_process_id=eq.${ingestId}&tag=eq.${encodeURIComponent(
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

  const updateIngestProcess = useCallback(async () => {
    const response = await fetch(
      `${ingestPGPrefix}/map_ingest?id=eq.${ingestProcess.id}`
    );
    const data = await response.json();
    setIngestProcess(data[0]);
    onUpdate();
  }, []);

  const { id } = _ingestProcess;
  const tags = _ingestProcess.tags ?? [];

  return h(
    "div.flex.row",
    { style: { paddingBottom: "4px", display: "flex", gap: "0.5em" } },
    [
      h.if(ingestProcess.state !== undefined)(
        Tag,
        {
          value: ingestProcess.state,
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
          onClick: async () => {
            await deleteTag(tag, id);
            await updateIngestProcess();
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
    ]
  );
}

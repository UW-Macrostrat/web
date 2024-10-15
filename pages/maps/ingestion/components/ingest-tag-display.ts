import { Card, AnchorButton } from "@blueprintjs/core";
import { useCallback, useState } from "react";

import { ingestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import AddButton from "../components/AddButton";
import Tag from "./Tag";
import styles from "./ingest-process-card.module.sass";

const h = hyper.styled(styles);

const deleteTag = async (tag: string, ingestId: number) => {
  const response = await fetch(
    `${ingestPrefix}/ingest-process/${ingestId}/tags/${tag}`,
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
      `${ingestPrefix}/ingest-process/${ingestProcess.id}`
    );
    setIngestProcess(await response.json());
    onUpdate();
  }, []);

  const { id, tags } = ingestProcess;

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
      tags.map((tag, i) => {
        return h(Tag, {
          key: tag,
          value: tag,
          style: { marginTop: "auto", marginBottom: "auto" },
          onClick: async () => {
            await updateIngestProcess();
            await deleteTag(tag, id);
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

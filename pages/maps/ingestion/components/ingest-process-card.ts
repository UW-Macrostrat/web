import { Card, AnchorButton } from "@blueprintjs/core";
import { useCallback, useState } from "react";

import { ingestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import AddButton from "#/maps/ingestion/components/AddButton";
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

export function IngestProcessCard({
  ingestProcess,
  user,
  onUpdate,
}: {
  ingestProcess: IngestProcess;
  user: any | undefined;
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

  console.log("ingestProcess", ingestProcess);

  const { id, tags } = _ingestProcess;
  const { slug, name, source_id, scale, raster_url } = _ingestProcess.source;
  const edit_href = `/maps/ingestion/${source_id}`;

  return h(
    Card,
    {
      className: "map-card",
    },
    [
      h("div.flex.row", [
        h("h3.map-card-title", name),
        h("div.spacer"),
        h.if(
          user !== undefined &&
            !["failed", "pending"].includes(ingestProcess.state)
        )(AnchorButton, { href: edit_href, icon: "edit" }),
      ]),
      h(
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
      ),
      h("div.flex.row", [
        h("h6", { style: { margin: "0px" } }, `Scale: ${scale}`),
        h("h6", { style: { margin: "0px" } }, `Source ID: ${source_id}`),
        h("h6", { style: { margin: "0px" } }, `Slug: ${slug}`),
      ]),
      h.if(raster_url != null)([
        " ",
        h("span.raster", { style: { marginTop: ".5rem" } }, "Raster"),
      ]),
    ]
  );
}

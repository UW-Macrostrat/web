import { Card, AnchorButton } from "@blueprintjs/core";
import { useCallback, useState } from "react";

import { ingestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import AddButton from "#/maps/ingestion/components/AddButton";
import Tag from "./Tag";
import styles from "./ingest-process-card.module.sass";
import { IngestTagDisplay } from "#/maps/ingestion/components/ingest-tag-display";

const h = hyper.styled(styles);
interface IngestProcess {
  id: number;
  slug: string;
  name: string;
  source_id: number;
  scale: string | null;
  raster_url: string | null;
  tags: string[] | { tag: string }[];
  state?: string;
}

export function IngestProcessCard({
  ingestProcess,
  refTitle,
  user,
  onUpdate,
}: {
  ingestProcess: IngestProcess;
  refTitle?: string | null;
  user: any | undefined;
  onUpdate: () => void;
}) {
  const { slug, source_id, scale, raster_url } = ingestProcess;
  const edit_href = `/maps/ingestion/${source_id}`;

  return h(
    Card,
    {
      className: "map-card",
    },
    [
      h("div.flex.row", [
        h("h3.map-card-title", refTitle),
        h("div.spacer"),
        h.if(user !== undefined)(AnchorButton, {
          href: edit_href,
          icon: "edit",
        }),
      ]),
      h(IngestTagDisplay, { ingestProcess: ingestProcess, onUpdate }),
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

import { Card, AnchorButton } from "@blueprintjs/core";
import { useCallback, useState } from "react";

import { ingestPrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import AddButton from "#/maps/ingestion/components/AddButton";
import Tag from "./Tag";
import styles from "./ingest-process-card.module.sass";
import { IngestTagDisplay } from "#/maps/ingestion/components/ingest-tag-display";

const h = hyper.styled(styles);

export function IngestProcessCard({
  ingestProcess,
  user,
  onUpdate,
}: {
  ingestProcess: IngestProcess;
  user: any | undefined;
  onUpdate: () => void;
}) {
  const { slug, name, source_id, scale, raster_url } = ingestProcess.source;
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

import { Card, AnchorButton, Button, Alert } from "@blueprintjs/core";
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

  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const response = await fetch(`${ingestPrefix}/ingest-process/delete-map`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error("Failed to delete map", response.status, text);
        return;
      }
      onUpdate();
    } finally {
      setDeleting(false);
      setShowDeleteAlert(false);
    }
  }, [slug, onUpdate]);

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
        h.if(user !== undefined)(Button, {
          icon: "trash",
          intent: "danger",
          minimal: true,
          loading: deleting,
          "aria-label": "Delete map",
          onClick: () => setShowDeleteAlert(true),
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
      h(
        Alert,
        {
          isOpen: showDeleteAlert,
          intent: "danger",
          icon: "trash",
          confirmButtonText: "Delete map",
          cancelButtonText: "Cancel",
          loading: deleting,
          onConfirm: confirmDelete,
          onCancel: () => setShowDeleteAlert(false),
        },
        [
          h("p", [
            "Are you sure you want to delete the map ",
            h("strong", slug),
            "? This runs ",
            h("code", "macrostrat maps staging delete"),
            " in the background and cannot be undone.",
          ]),
        ]
      ),
    ]
  );
}

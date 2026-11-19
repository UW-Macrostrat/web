/** Columns of other projects at the same place, which no map draws together
 * with this one — GBDB beside ChinaLex, say. One collapsed row per project,
 * expanding to its nearest columns. */
import hyper from "@macrostrat/hyper";
import { apiV3Prefix } from "@macrostrat-web/settings";
import { Button, Collapse } from "@blueprintjs/core";
import { DataField, Tag, TagSize } from "@macrostrat/data-components";
import { useEffect, useState } from "react";
import { IN_PROCESS_STATUS } from "~/components/in-process-filter";
import styles from "./index.module.sass";

const h = hyper.styled(styles);

interface NearbyColumn {
  col_id: number;
  col_name: string;
  status_code: string;
  relation: "overlaps" | "nearby";
  distance_km: number;
}

interface NearbyProject {
  project_id: number;
  project: string;
  slug: string | null;
  n_columns: number;
  n_overlapping: number;
  columns: NearbyColumn[];
}

interface NearbyColumnsResult {
  col_id: number;
  radius_km: number;
  projects: NearbyProject[];
}

function useNearbyColumns(colID: number | null) {
  const [data, setData] = useState<NearbyColumnsResult | null>(null);

  useEffect(() => {
    if (colID == null) return;
    let cancelled = false;
    setData(null);
    fetch(`${apiV3Prefix}/columns/${colID}/nearby`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return (await res.json()) as NearbyColumnsResult;
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      // An aside to the column, so a failure leaves it out rather than erroring
      .catch((error) => console.warn("Nearby columns:", error));
    return () => {
      cancelled = true;
    };
  }, [colID]);

  return data;
}

export function NearbyColumns({ colID }: { colID: number }) {
  const data = useNearbyColumns(colID);
  if (data == null || data.projects.length === 0) return null;

  return h(
    DataField,
    { label: "Other projects here", className: "nearby-columns" },
    data.projects.map((project) =>
      h(NearbyProjectEntry, { key: project.project_id, project })
    )
  );
}

function NearbyProjectEntry({ project }: { project: NearbyProject }) {
  const [isOpen, setOpen] = useState(false);
  const hidden = project.n_columns - project.columns.length;

  let more = null;
  if (hidden > 0) {
    more = h("li.nearby-more", `and ${hidden.toLocaleString()} more`);
  }
  let icon = "chevron-right";
  if (isOpen) icon = "chevron-down";

  return h("div.nearby-project", [
    h(
      Button,
      {
        className: "nearby-project-toggle",
        minimal: true,
        small: true,
        alignText: "left",
        icon,
        onClick: () => setOpen(!isOpen),
      },
      [
        h("span.nearby-project-name", project.project),
        h("span.nearby-count", projectSummary(project)),
      ]
    ),
    h(Collapse, { isOpen }, [
      h("ul.nearby-list", [
        project.columns.map((col) =>
          h(NearbyColumnItem, { key: col.col_id, col })
        ),
        more,
      ]),
    ]),
  ]);
}

function projectSummary(project: NearbyProject): string {
  const nearby = project.n_columns - project.n_overlapping;
  const parts = [];
  if (project.n_overlapping > 0) {
    parts.push(`${project.n_overlapping.toLocaleString()} overlapping`);
  }
  if (nearby > 0) {
    parts.push(`${nearby.toLocaleString()} nearby`);
  }
  return parts.join(", ");
}

function NearbyColumnItem({ col }: { col: NearbyColumn }) {
  let status = null;
  if (col.status_code === IN_PROCESS_STATUS) {
    status = h(Tag, {
      size: TagSize.Small,
      name: col.status_code,
      color: "lightgreen",
    });
  }
  return h("li.nearby-column", [
    h("a.field-link", { href: `/columns/${col.col_id}` }, col.col_name),
    status,
    h(
      "span.nearby-distance",
      { title: "Distance between the columns' points" },
      `${Math.round(col.distance_km)} km`
    ),
  ]);
}

/** Columns at the same place: other projects' that no map draws together with
 * this one (GBDB beside ChinaLex), and its own project's (holes of one eODP
 * site). One collapsed row per project, expanding to its columns, nearest first. */
import hyper from "@macrostrat/hyper";
import { apiV3Prefix } from "@macrostrat-web/settings";
import { Button, Collapse } from "@blueprintjs/core";
import { DataField, Tag, TagSize } from "@macrostrat/data-components";
import { useEffect, useState } from "react";
import { IN_PROCESS_STATUS } from "~/components/in-process-filter";
import type { ColumnProject } from "../+data.shared";
import styles from "./index.module.sass";

const h = hyper.styled(styles);

/** `col_type` of a measured section, as opposed to a composite column */
const SECTION = "section";

interface NearbyColumn {
  col_id: number;
  col_name: string;
  status_code: string;
  col_type: string;
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
  col_type: string;
  radius_km: number;
  projects: NearbyProject[];
}

function useNearbyColumns(colID: number | null) {
  const [data, setData] = useState<NearbyColumnsResult | null>(null);

  useEffect(() => {
    setData(null);
    if (colID == null) return;
    let cancelled = false;
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

export function NearbyColumns({
  colID,
  projectID,
  columnProjects,
}: {
  colID: number;
  projectID: number;
  columnProjects?: ColumnProject[];
}) {
  const data = useNearbyColumns(colID);
  if (data == null || data.projects.length === 0) return null;
  const related = relatedProjectIDs(projectID, columnProjects ?? []);

  return h(
    DataField,
    { label: "Nearby columns", className: "nearby-columns" },
    // A block of its own, so rows span the field rather than wrap to the right
    h(
      "div.nearby-projects",
      data.projects.map((project) =>
        h(NearbyProjectEntry, {
          key: project.project_id,
          project,
          defaultOpen: related.has(project.project_id),
          fromSection: data.col_type === SECTION,
        })
      )
    )
  );
}

/** The column's own project and the other members of composites holding it,
 * whose nearby columns are usually the same site or compilation. */
function relatedProjectIDs(
  projectID: number,
  columnProjects: ColumnProject[]
): Set<number> {
  const ids = new Set([projectID]);
  for (const p of columnProjects) {
    for (const id of p.member_ids ?? []) ids.add(id);
  }
  return ids;
}

function NearbyProjectEntry({
  project,
  defaultOpen,
  fromSection,
}: {
  project: NearbyProject;
  defaultOpen: boolean;
  fromSection: boolean;
}) {
  const [isOpen, setOpen] = useState(defaultOpen);
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
      h(
        "ul.nearby-list",
        project.columns.map((col) =>
          h(NearbyColumnItem, { key: col.col_id, col, fromSection })
        )
      ),
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

function NearbyColumnItem({
  col,
  fromSection,
}: {
  col: NearbyColumn;
  fromSection: boolean;
}) {
  let status = null;
  if (col.status_code === IN_PROCESS_STATUS) {
    status = h(Tag, {
      size: TagSize.Small,
      name: col.status_code,
      color: "lightgreen",
    });
  }
  // A composite's point stands in for a region, so a distance to it means little
  let distance = null;
  if (fromSection && col.col_type === SECTION) {
    distance = h(
      "span.nearby-distance",
      { title: "Distance between the two sections" },
      formatDistance(col.distance_km)
    );
  }
  return h("li.nearby-column", [
    h("a.field-link", { href: `/columns/${col.col_id}` }, col.col_name),
    status,
    distance,
  ]);
}

/** Metres for holes at one site, kilometres for regions apart */
function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

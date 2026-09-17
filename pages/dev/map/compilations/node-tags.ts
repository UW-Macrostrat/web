/** The tags that make a node's standing in the compilation system legible.
 *
 * Kept apart from the tree itself because the vocabulary is the point: nothing
 * in the database marks a compilation as a *kind*, so what a reader needs is the
 * handful of derived facts that distinguish the cases — has members, holds
 * polygons, is served as a layer, where the polygons came from.
 */

import hyper from "@macrostrat/hyper";
import { Tag } from "@blueprintjs/core";
import type { Intent } from "@blueprintjs/core";
import type { CompilationState, GraphNode } from "./graph";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

interface StateTag {
  label: string;
  intent: Intent;
  title: string;
}

export const stateTags: Record<CompilationState, StateTag> = {
  virtual: {
    label: "virtual",
    intent: "none",
    title:
      "Holds no polygons of its own. Resolution descends through it to whichever member has the geometry.",
  },
  current: {
    label: "materialized",
    intent: "success",
    title:
      "Polygons assembled from its members, and current with the member set. Resolution stops here.",
  },
  stale: {
    label: "stale",
    intent: "warning",
    title:
      "Materialized, but its members have changed since. Re-run `macrostrat compilations materialize`.",
  },
  ingested: {
    label: "ingested",
    intent: "primary",
    title:
      "The polygons arrived with the compilation; its members record where they came from, and hold no polygons of their own.",
  },
};

export function NodeTags({
  node,
  priority,
}: {
  node: MapNode & { state?: CompilationState | null };
  priority?: number | null;
}) {
  const tags = [];

  if (priority != null) {
    tags.push(
      h(
        Tag,
        {
          key: "priority",
          minimal: true,
          className: "priority-tag",
          title:
            "Priority within its parent — higher wins where members overlap",
        },
        `p${priority}`
      )
    );
  }

  if (node.is_served_layer) {
    tags.push(
      h(
        Tag,
        {
          key: "layer",
          minimal: true,
          intent: "primary",
          title:
            "A compilation served as a tile layer: its dissolve is cached in map_face and it carries a zoom range.",
        },
        "layer"
      )
    );
  }

  const state = node.state;
  if (node.is_compilation && state != null) {
    const tag = stateTags[state];
    tags.push(
      h(
        Tag,
        { key: "state", minimal: true, intent: tag.intent, title: tag.title },
        tag.label
      )
    );
  }

  if (node.superseded_by != null) {
    tags.push(
      h(
        Tag,
        {
          key: "superseded",
          minimal: true,
          intent: "warning",
          title:
            "Superseded by a better map. Kept rather than deleted, and excluded from the compilations.",
        },
        "superseded"
      )
    );
  }

  if (node.is_mosaic_member) {
    tags.push(
      h(
        Tag,
        {
          key: "mosaic-member",
          minimal: true,
          title:
            "A mosaic member: a real source whose footprint is its extent and whose content is the mosaic's inside it. No polygons, linework or faces of its own.",
        },
        "mosaic member"
      )
    );
  }

  if (node.scale != null) {
    tags.push(h(Tag, { key: "scale", minimal: true }, node.scale));
  }

  if (tags.length === 0) return null;
  return h("span.tags", tags);
}

export function formatArea(areaKm: number | null): string | null {
  if (areaKm == null) return null;
  if (areaKm >= 1e6) return `${(areaKm / 1e6).toFixed(1)}M km²`;
  if (areaKm >= 1e3) return `${Math.round(areaKm / 1e3)}k km²`;
  return `${Math.round(areaKm)} km²`;
}

/** The tags that make a node's standing in the compilation system legible.
 *
 * Kept apart from the tree itself because the vocabulary is the point: nothing
 * in the database marks a compilation as a *kind*, so what a reader needs is the
 * handful of derived facts that distinguish the cases — has members, holds
 * polygons, is served as a layer, where the polygons came from.
 */

import { Tag } from "@blueprintjs/core";
import type { Intent } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";

import type { GraphNode } from "./graph";
import styles from "./tree.module.sass";

const h = hyper.styled(styles);

interface ContentTag {
  label: string;
  intent: Intent;
  title: string;
}

/** The four readings of a compilation's content, for a legend. */
export const contentTags: ContentTag[] = [
  contentTag({ is_materialized: false, is_derived: false, is_stale: false }),
  contentTag({ is_materialized: true, is_derived: false, is_stale: false }),
  contentTag({ is_materialized: true, is_derived: true, is_stale: false }),
  contentTag({ is_materialized: true, is_derived: true, is_stale: true }),
];

/** What a compilation's content is, from three facts: holds polygons; those
 * polygons are cut from its members'; the members have changed since. */
export function contentTag(
  node: Pick<GraphNode, "is_materialized" | "is_derived" | "is_stale">
): ContentTag {
  if (!node.is_materialized) {
    return {
      label: "virtual",
      intent: "none",
      title:
        "Holds no polygons of its own. Resolution descends through it to whichever member has the geometry.",
    };
  }
  if (!node.is_derived) {
    return {
      label: "materialized",
      intent: "primary",
      title:
        "Holds polygons that arrived with it; its members record where they came from and hold none of their own.",
    };
  }
  if (node.is_stale) {
    return {
      label: "stale",
      intent: "warning",
      title:
        "Polygons cut from its members, but the members have changed since. Re-run `macrostrat compilations materialize`.",
    };
  }
  return {
    label: "derived",
    intent: "success",
    title:
      "Polygons cut from its members, current with the member set. Resolution stops here.",
  };
}

export function NodeTags({
  node,
  priority,
}: {
  node: GraphNode;
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

  if (node.has_faces) {
    tags.push(
      h(
        Tag,
        {
          key: "layer",
          minimal: true,
          intent: "primary",
          title:
            "A compilation whose faces are cached in map_face and which carries a zoom range.",
        },
        "layer"
      )
    );
  }

  if (node.is_compilation) {
    const tag = contentTag(node);
    tags.push(
      h(
        Tag,
        { key: "content", minimal: true, intent: tag.intent, title: tag.title },
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
            "A mosaic member: a real source whose bounds are its extent and whose content is the mosaic's inside them. No polygons, linework or faces of its own.",
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

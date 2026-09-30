/** The tags that make a node's standing in the compilation system legible.
 *
 * Kept apart from the tree itself because the vocabulary is the point: nothing
 * in the database marks a compilation as a *kind*, so what a reader needs is the
 * handful of facts that distinguish the cases — what kind of node it is, and
 * whether it needs attention.
 */

import { Tag } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";

import type { GraphNode } from "./graph";
import styles from "./tree.module.sass";

const h = hyper.styled(styles);

/** Coloured by the `kind-<label>` class: the two that hold polygons share the
 * blue of the faces overlay, since they are what it draws. */
interface KindTag {
  label: string;
  title: string;
}

/** What a node is, as one tag. A materialized compilation holds polygons of
 * its own, so how its members are assembled no longer decides anything; a
 * virtual one is read through its members, so how they are assembled is the
 * whole story. */
export const kindTags: KindTag[] = [
  {
    label: "multiscale",
    title:
      "One member per scale; a request at a zoom is answered by the member at that zoom's scale.",
  },
  {
    label: "topological",
    title:
      "Members may overlap; priority resolves them, and each member's extent is the faces it wins.",
  },
  {
    label: "mosaic",
    title:
      "Members partition it and never overlap; each member's extent is its bounds.",
  },
  {
    label: "materialized",
    title:
      "Holds polygons of its own, so resolution stops here; its members record where they came from.",
  },
  {
    label: "map",
    title: "A map: polygons of its own, and no members.",
  },
];

function tagFor(label: string): KindTag {
  return kindTags.find((t) => t.label === label)!;
}

export function kindTag(
  node: Pick<GraphNode, "is_compilation" | "is_materialized" | "assembly_mode">
): KindTag {
  if (!node.is_compilation) return tagFor("map");
  if (node.assembly_mode === "multiscale") return tagFor("multiscale");
  if (node.is_materialized) return tagFor("materialized");
  if (node.assembly_mode === "mosaic") return tagFor("mosaic");
  return tagFor("topological");
}

export function NodeTags({ node }: { node: GraphNode }) {
  const tags = [];

  const kind = kindTag(node);
  tags.push(
    h(
      Tag,
      {
        key: "kind",
        minimal: true,
        className: `kind-tag kind-${kind.label}`,
        title: kind.title,
      },
      kind.label
    )
  );

  if (node.is_stale) {
    tags.push(
      h(
        Tag,
        {
          key: "stale",
          minimal: true,
          intent: "warning",
          title:
            "Its polygons were cut from its members, which have changed since. Re-run `macrostrat compilations materialize`.",
        },
        "stale"
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

/** Bounds covering the Earth's whole surface (510M km²) read as `global`,
 * whether asserted (`world`) or unioned from members that span it. */
export function formatArea(areaKm: number | null): string | null {
  if (areaKm == null) return null;
  if (areaKm >= 5e8) return "global";
  if (areaKm >= 1e6) return `${(areaKm / 1e6).toFixed(1)}M km²`;
  if (areaKm >= 1e3) return `${Math.round(areaKm / 1e3)}k km²`;
  return `${Math.round(areaKm)} km²`;
}

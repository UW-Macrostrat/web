/** The compilation hierarchy, as an expandable tree.
 *
 * The whole graph is already in memory, so expanding a node is local work — no
 * request per level, and a search can look *through* closed branches because
 * the nodes beneath them are here whether or not they are drawn.
 *
 * Selecting a node re-roots the tree on it: the main panel then shows that
 * compilation and its subsidiary tree, with a breadcrumb back out, and the map
 * draws the same node. One idea — "the thing I am looking at" — driving both,
 * which is what the previous two-control version got wrong.
 */

import { Button, InputGroup, NonIdealState, Tag } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useMemo, useState } from "react";

import { Link } from "~/components";

import {
  mapPageHref,
  scaleOrder,
  type GraphEdge,
  type GraphNode,
} from "./graph";
import { formatArea, NodeTags } from "./node-tags";
import {
  childrenAtom,
  focusNodeAtom,
  focusPathAtom,
  focusSlugAtom,
  matchingIdsAtom,
  nodesByIdAtom,
  rootsAtom,
  scaleFilterAtom,
  searchTextAtom,
  standaloneNodesAtom,
} from "./state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function CompilationTree() {
  return h("div.compilation-tree", [
    h(TreeToolbar),
    h(FocusBreadcrumbs),
    h(TreeBody),
  ]);
}

/* ------------------------------------------------------------------ toolbar */

function TreeToolbar() {
  const [text, setText] = useAtom(searchTextAtom);

  return h("div.tree-toolbar", [
    h(InputGroup, {
      className: "tree-search",
      leftIcon: "search",
      placeholder: "Search maps and compilations…",
      value: text,
      onChange: (evt) => setText(evt.currentTarget.value),
      rightElement: text
        ? h(Button, {
            minimal: true,
            icon: "cross",
            onClick: () => setText(""),
          })
        : undefined,
    }),
    h(ScaleFilter),
  ]);
}

/** Scale bands, coarse to fine — the order they mean something in, which is not
 * alphabetical. Nothing selected means all of them. */
function ScaleFilter() {
  const [scales, setScales] = useAtom(scaleFilterAtom);

  return h(
    "div.scale-filter",
    scaleOrder.map((scale) => {
      const active = scales.includes(scale);
      return h(
        Button,
        {
          key: scale,
          small: true,
          minimal: !active,
          intent: active ? "primary" : "none",
          onClick: () => {
            if (active) {
              setScales(scales.filter((s) => s !== scale));
            } else {
              setScales([...scales, scale]);
            }
          },
        },
        scale
      );
    })
  );
}

/* -------------------------------------------------------------- breadcrumbs */

/** The route back out of a selection. Shown only when something is selected —
 * at the top level the roots are already the whole story. */
function FocusBreadcrumbs() {
  const path = useAtomValue(focusPathAtom);
  const setFocus = useSetAtom(focusSlugAtom);

  if (path.length === 0) return null;

  const trail = path.slice(0, -1).map((node) =>
    h(
      Button,
      {
        key: node.source_id,
        minimal: true,
        small: true,
        onClick: () => setFocus(node.slug),
      },
      node.name ?? node.slug
    )
  );

  return h("div.focus-breadcrumbs", [
    h(
      Button,
      {
        minimal: true,
        small: true,
        icon: "home",
        onClick: () => setFocus(null),
      },
      "All"
    ),
    trail,
  ]);
}

/* --------------------------------------------------------------- tree body */

function TreeBody() {
  const focus = useAtomValue(focusNodeAtom);
  const roots = useAtomValue(rootsAtom);
  const matching = useAtomValue(matchingIdsAtom);

  // Rooted on the selection when there is one, otherwise on the graph's own
  // roots — the compilations nothing else contains.
  const shown = useMemo(() => {
    if (focus != null) return [focus];
    return roots;
  }, [focus, roots]);

  const visible = shown.filter(
    (node) => matching == null || matching.has(node.source_id)
  );

  // Only at the top level: once a node is selected, the panel is about that
  // node's own subtree and an unrelated bucket below it is noise.
  let standalone = null;
  if (focus == null) {
    standalone = h(StandaloneGroup);
  }

  if (visible.length === 0 && standalone == null) {
    return h(NonIdealState, {
      className: "tree-empty",
      icon: "search",
      title: "Nothing here",
      description:
        "No compilation matches. Clear the search, the scale filter, or the location.",
    });
  }

  return h("ul.tree", [
    visible.map((node) =>
      h(TreeNode, {
        key: node.source_id,
        node,
        path: `${node.source_id}`,
        // The selected node is the subject of the panel, so it opens; so do the
        // served layers at the top level, which are structural containers.
        defaultOpen: focus != null || node.is_served_layer,
        depth: 0,
      })
    ),
    standalone,
  ]);
}

/** Ingested maps that belong to no compilation.
 *
 * A real branch of the hierarchy rather than a compilation: nothing in the
 * database groups these, so there is no node to stand for them, and inventing
 * one would claim a membership that does not exist. It is a fallback bucket,
 * and reads as one — the NGS quadrangles sit here until something wraps them,
 * and a superseded map often stays here for good.
 */
function StandaloneGroup() {
  const nodes = useAtomValue(standaloneNodesAtom);
  const isFiltering = useAtomValue(matchingIdsAtom) != null;
  const [isOpen, setOpen] = useState(false);

  if (nodes.length === 0) return null;

  const open = isOpen || isFiltering;

  let chevron = "chevron-right";
  if (open) chevron = "chevron-down";

  let members = null;
  if (open) {
    members = h(
      "ul.tree",
      nodes.map((node) =>
        h(TreeNode, {
          key: node.source_id,
          node,
          path: `standalone/${node.source_id}`,
          depth: 1,
        })
      )
    );
  }

  return h("li.tree-node.standalone-group", [
    h("div.node-row", [
      h(Button, {
        minimal: true,
        small: true,
        className: "expander",
        icon: chevron,
        onClick: () => setOpen(!isOpen),
      }),
      h("div.node-body", [
        h("div.node-title", h("span.standalone-name", "Standalone maps")),
        h("div.node-stats", `${nodes.length} ingested maps in no compilation`),
      ]),
    ]),
    members,
  ]);
}

interface TreeNodeProps {
  node: GraphNode;
  /** Identity of this *appearance*: a node reached under two compilations is
   * two rows, and they expand independently. */
  path: string;
  edge?: GraphEdge | null;
  depth: number;
  defaultOpen?: boolean;
}

function TreeNode({
  node,
  path,
  edge = null,
  depth,
  defaultOpen = false,
}: TreeNodeProps) {
  const [isOpen, setOpen] = useState(defaultOpen);
  const children = useAtomValue(childrenAtom);
  const byId = useAtomValue(nodesByIdAtom);
  const matching = useAtomValue(matchingIdsAtom);
  const [focusSlug, setFocus] = useAtom(focusSlugAtom);

  const edges = children.get(node.source_id) ?? [];
  const memberRows = edges
    .map((e) => ({ edge: e, node: byId.get(e.member_id) }))
    .filter(({ node: n }) => n != null)
    .filter(({ node: n }) => matching == null || matching.has(n!.source_id));

  // While a filter is active every surviving branch is on the path to a match,
  // so opening them is what shows the match rather than the ancestor that
  // happens to contain it. Local expansion state is left alone, so clearing the
  // filter returns the tree to however it was arranged.
  const isFiltering = matching != null;
  const open = isOpen || isFiltering;

  let chevron = "chevron-right";
  if (open) chevron = "chevron-down";

  let expander = null;
  if (memberRows.length > 0) {
    expander = h(Button, {
      minimal: true,
      small: true,
      className: "expander",
      icon: chevron,
      onClick: () => setOpen(!isOpen),
      title: `${node.n_members} members`,
    });
  } else {
    expander = h("span.expander-spacer");
  }

  let members = null;
  if (open && memberRows.length > 0) {
    members = h(
      "ul.tree",
      memberRows.map(({ edge: e, node: child }) =>
        h(TreeNode, {
          key: `${path}/${child!.source_id}`,
          node: child!,
          path: `${path}/${child!.source_id}`,
          edge: e,
          depth: depth + 1,
        })
      )
    );
  }

  const isSelected = focusSlug === node.slug;

  return h("li.tree-node", { className: isSelected ? "selected" : undefined }, [
    h("div.node-row", [
      expander,
      h("div.node-body", [
        h("div.node-title", [
          h(PriorityTag, { edge }),
          // Selecting is the primary action, so it is the row's own click
          // target; the map page is a deliberate second step.
          h(
            "button.node-name",
            {
              onClick: () => setFocus(node.slug),
              title: "Show this in the panel and on the map",
            },
            node.name ?? node.slug
          ),
          h(NodeTags, { node }),
          h(
            Link,
            {
              href: mapPageHref(node),
              className: "node-page-link",
              title: "Open this map's page",
            },
            "↗"
          ),
        ]),
        h(NodeStats, { node }),
      ]),
    ]),
    members,
  ]);
}

function PriorityTag({ edge }: { edge: GraphEdge | null }) {
  if (edge?.priority == null) return null;
  return h(
    Tag,
    {
      minimal: true,
      className: "priority-tag",
      title:
        "Priority within its compilation — higher wins where members overlap",
    },
    `p${edge.priority}`
  );
}

function NodeStats({ node }: { node: GraphNode }) {
  const parts: string[] = [node.slug];

  if (node.n_members > 0) {
    parts.push(`${node.n_members} members`);
    // What it resolves to, descending through member compilations. Identical to
    // the member count when nothing below is itself a compilation.
    if (node.n_sources !== node.n_members) {
      parts.push(`${node.n_sources} maps`);
    }
  }

  const area = formatArea(node.area_km);
  if (area != null) parts.push(area);

  return h("div.node-stats", parts.join(" · "));
}

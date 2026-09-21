/** The compilation hierarchy, as an expandable tree.
 *
 * The whole graph is already in memory, so expanding a node is local work — no
 * request per level, and a search looks *through* closed branches because the
 * nodes beneath them are here whether or not they are drawn.
 *
 * Selecting a node sets the page's focus slug and nothing else: the tree stays
 * where it is, with the selection highlighted in place. Expansion and selection
 * are separate gestures, which is what keeps "where am I in the hierarchy" and
 * "what am I looking at" from fighting each other.
 */

import { Button, InputGroup, NonIdealState } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useState, type ReactNode } from "react";

import { Link } from "~/components";

import {
  mapPageHref,
  nodeName,
  scaleOrder,
  type GraphEdge,
  type GraphNode,
} from "./graph";
import { formatArea, NodeTags } from "./node-tags";
import type { CompilationTreeAtoms } from "./state";
import styles from "./tree.module.sass";

const h = hyper.styled(styles);

export interface CompilationTreeProps {
  atoms: CompilationTreeAtoms;
  /** Extra controls beneath the search box — a scale filter, say. Pages differ
   * on what belongs here, and a slot beats a flag per control. */
  toolbar?: ReactNode;
  /** Ingested maps in no compilation. A real part of the catalog, but noise when
   * the tree is a navigator for compilations. */
  showStandalone?: boolean;
  /** Called after a node is selected or cleared. A tree in a popover is a
   * control, and a control's job ends when the choice is made. */
  onSelect?: (slug: string | null) => void;
}

export function CompilationTree({
  atoms,
  toolbar = null,
  showStandalone = true,
  onSelect = null,
}: CompilationTreeProps) {
  return h("div.compilation-tree", [
    h(TreeToolbar, { atoms, toolbar }),
    h(TreeBody, { atoms, showStandalone, onSelect }),
  ]);
}

/* ------------------------------------------------------------------ toolbar */

function TreeToolbar({ atoms, toolbar }) {
  const [text, setText] = useAtom(atoms.searchText);

  let clearButton = undefined;
  if (text !== "") {
    clearButton = h(Button, {
      minimal: true,
      icon: "cross",
      onClick: () => setText(""),
    });
  }

  return h("div.tree-toolbar", [
    h(InputGroup, {
      className: "tree-search",
      leftIcon: "search",
      placeholder: "Search maps and compilations…",
      value: text,
      onChange: (evt) => setText(evt.currentTarget.value),
      rightElement: clearButton,
    }),
    toolbar,
  ]);
}

/** Scale bands, coarse to fine — the order they mean something in, which is not
 * alphabetical. Nothing selected means all of them. */
export function ScaleFilter({ atoms }: { atoms: CompilationTreeAtoms }) {
  const [scales, setScales] = useAtom(atoms.scaleFilter);

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

/* --------------------------------------------------------------- tree body */

function TreeBody({ atoms, showStandalone, onSelect }) {
  const roots = useAtomValue(atoms.roots);
  const matching = useAtomValue(atoms.matchingIds);
  const standaloneNodes = useAtomValue(atoms.standaloneNodes);

  const visible = roots.filter(
    (node) => matching == null || matching.has(node.source_id)
  );

  const hasStandalone = showStandalone && standaloneNodes.length > 0;

  let standalone = null;
  if (hasStandalone) {
    standalone = h(StandaloneGroup, { atoms, onSelect });
  }

  if (visible.length === 0 && !hasStandalone) {
    return h(NonIdealState, {
      className: "tree-empty",
      icon: "search",
      title: "Nothing here",
      description: "No compilation matches. Clear the search or the filters.",
    });
  }

  return h("ul.tree", [
    visible.map((node) =>
      h(TreeNode, {
        key: node.source_id,
        atoms,
        node,
        onSelect,
        path: `${node.source_id}`,
        // Served layers are structural containers: their contents are the point,
        // so they open.
        defaultOpen: node.is_served_layer,
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
function StandaloneGroup({ atoms, onSelect }) {
  const nodes = useAtomValue(atoms.standaloneNodes);
  const isFiltering = useAtomValue(atoms.matchingIds) != null;
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
          atoms,
          node,
          onSelect,
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
  atoms: CompilationTreeAtoms;
  node: GraphNode;
  onSelect?: ((slug: string | null) => void) | null;
  /** Identity of this *appearance*: a node reached under two compilations is
   * two rows, and they expand independently. */
  path: string;
  edge?: GraphEdge | null;
  depth: number;
  defaultOpen?: boolean;
}

function TreeNode({
  atoms,
  node,
  onSelect = null,
  path,
  edge = null,
  depth,
  defaultOpen = false,
}: TreeNodeProps) {
  const children = useAtomValue(atoms.children);
  const byId = useAtomValue(atoms.nodesById);
  const matching = useAtomValue(atoms.matchingIds);
  const focusAncestors = useAtomValue(atoms.focusAncestorIds);
  const [focusSlug, setFocus] = useAtom(atoms.focusSlug);

  const edges = children.get(node.source_id) ?? [];
  const memberRows = edges
    .map((e) => ({ edge: e, node: byId.get(e.member_id) }))
    .filter(({ node: n }) => n != null)
    .filter(({ node: n }) => matching == null || matching.has(n!.source_id));

  // While a filter is active every surviving branch is on the path to a match,
  // so opening them is what shows the match rather than the ancestor that
  // happens to contain it. The same goes for the route down to the selection:
  // the tree opens itself far enough to show what the page is displaying.
  const autoOpen =
    matching != null || focusAncestors.has(node.source_id) || defaultOpen;

  const open = useDisclosure(autoOpen);

  let chevron = "chevron-right";
  if (open.isOpen) chevron = "chevron-down";

  let expander = h("span.expander-spacer");
  if (memberRows.length > 0) {
    expander = h(Button, {
      minimal: true,
      small: true,
      className: "expander",
      icon: chevron,
      onClick: open.toggle,
      title: `${node.n_members} members`,
    });
  }

  let members = null;
  if (open.isOpen && memberRows.length > 0) {
    members = h(
      "ul.tree",
      memberRows.map(({ edge: e, node: child }) =>
        h(TreeNode, {
          key: `${path}/${child!.source_id}`,
          atoms,
          node: child!,
          onSelect,
          path: `${path}/${child!.source_id}`,
          edge: e,
          depth: depth + 1,
        })
      )
    );
  }

  const isSelected = focusSlug === node.slug;

  let selectedClass = undefined;
  if (isSelected) selectedClass = "selected";

  let selectTitle = "Show this compilation";
  if (isSelected) selectTitle = "Clear the selection";

  const selectThis = () => {
    let next: string | null = node.slug;
    if (isSelected) next = null;
    setFocus(next);
    onSelect?.(next);
  };

  return h("li.tree-node", { className: selectedClass }, [
    h("div.node-row", [
      expander,
      h("div.node-body", [
        h("div.node-title", [
          // Selecting is the primary action, so it is the row's own click
          // target; the map page is a deliberate second step.
          h(
            "button.node-name",
            { onClick: selectThis, title: selectTitle },
            nodeName(node)
          ),
          h(NodeTags, { node, priority: edge?.priority }),
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

/** Expansion that follows the tree's own cues until the reader overrides it.
 *
 * `autoOpen` covers the cases where a branch has to be visible — a filter is
 * on, or the selection is somewhere below. A click overrides it; the override is
 * dropped the next time `autoOpen` becomes true, so selecting a node reveals it
 * even inside a branch that was closed by hand. */
function useDisclosure(autoOpen: boolean) {
  const [override, setOverride] = useState<boolean | null>(null);

  useEffect(() => {
    if (autoOpen) setOverride(null);
  }, [autoOpen]);

  const isOpen = override ?? autoOpen;

  return { isOpen, toggle: () => setOverride(!isOpen) };
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

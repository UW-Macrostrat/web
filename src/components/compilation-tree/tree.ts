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
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";

import { Link } from "~/components";

import {
  mapPageHref,
  nodeName,
  scaleOrder,
  type GraphEdge,
  type GraphNode,
} from "./graph";
import {
  assemblyModeOf,
  tiersOf,
  type CompilationEditAtoms,
  type DragItem,
  type DropTarget,
} from "./editing";
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
  /** Edit state. Given, the tree offers drag, drop and removal while
   * `editor.editing` is on; absent, it is read-only. */
  editor?: CompilationEditAtoms | null;
}

/** The edit atoms, for rows at any depth — context rather than a prop threaded
 * through every level of the recursion. */
const EditorContext = createContext<CompilationEditAtoms | null>(null);

export function CompilationTree({
  atoms,
  toolbar = null,
  showStandalone = true,
  onSelect = null,
  editor = null,
}: CompilationTreeProps) {
  return h(
    EditorContext.Provider,
    { value: editor },
    h("div.compilation-tree", [
      h(TreeToolbar, { atoms, toolbar }),
      h(TreeBody, { atoms, showStandalone, onSelect }),
    ])
  );
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
        defaultOpen: node.has_faces,
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
  const focusDescendants = useAtomValue(atoms.focusDescendantIds);
  const focusResolved = useAtomValue(atoms.focusResolvedIds);
  const [focusSlug, setFocus] = useAtom(atoms.focusSlug);
  const editing = useEditing();

  const edges = children.get(node.source_id) ?? [];
  const memberRows = edges
    .map((e) => ({ edge: e, node: byId.get(e.member_id) }))
    .filter(({ node: n }) => n != null)
    .filter(({ node: n }) => matching == null || matching.has(n!.source_id));

  // While a filter is active every surviving branch is on the path to a match,
  // so opening them is what shows the match rather than the ancestor that
  // happens to contain it. The same goes for the selection: the tree opens the
  // route down to it, and everything inside it, to show what the page is
  // displaying.
  const reveal =
    focusAncestors.has(node.source_id) ||
    focusDescendants.has(node.source_id) ||
    defaultOpen;
  const open = useDisclosure({ filtering: matching != null, reveal });

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
    members = h(MemberList, {
      atoms,
      compilation: node,
      rows: memberRows,
      onSelect,
      path,
      depth,
    });
  }

  const isSelected = focusSlug === node.slug;

  // The rows the selection is drawn from: where its resolution stops.
  const classNames = [];
  if (isSelected) classNames.push("selected");
  if (focusResolved.has(node.source_id)) classNames.push("resolved");

  let selectTitle = "Show this compilation";
  if (isSelected) selectTitle = "Clear the selection";

  let priority = edge?.priority ?? null;
  if (editing) priority = null;

  const selectThis = () => {
    let next: string | null = node.slug;
    if (isSelected) next = null;
    setFocus(next);
    onSelect?.(next);
  };

  // Only a served source can be requested by name, so only it has a map page;
  // the link is how being served shows.
  let pageLink = null;
  if (node.is_served) {
    pageLink = h(
      Link,
      {
        href: mapPageHref(node),
        className: "node-page-link",
        title: "Open this map's page",
      },
      "↗"
    );
  }

  return h("li.tree-node", { className: classNames.join(" ") }, [
    h(NodeRow, { node, edge }, [
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
          h(NodeTags, { node }),
          pageLink,
        ]),
        h(NodeStats, { node, priority }),
      ]),
      h(RemoveButton, { node, edge }),
    ]),
    members,
  ]);
}

/* ---------------------------------------------------------------- editing */

const noEditing = atom(false);
const noDrag = atom<DragItem | null>(null);
const noDrop = atom(null, () => {});
const noRemove = atom(null, (_get, _set, _c: number, _m: number) => {});

function useEditor() {
  return useContext(EditorContext);
}

function useEditing() {
  const editor = useEditor();
  return useAtomValue(editor?.editing ?? noEditing);
}

/** A compilation's members: a plain list, or — while editing a topological
 * compilation — grouped into priority tiers, with a gap above, between and below
 * them that a drop turns into a new tier. */
function MemberList({ atoms, compilation, rows, onSelect, path, depth }) {
  const editing = useEditing();
  const graph = useAtomValue(atoms.graph);

  const renderRow = ({ edge: e, node: child }) =>
    h(TreeNode, {
      key: `${path}/${child.source_id}`,
      atoms,
      node: child,
      onSelect,
      path: `${path}/${child.source_id}`,
      edge: e,
      depth: depth + 1,
    });

  let tiered = false;
  if (editing) {
    tiered = assemblyModeOf(graph, compilation.source_id) === "topological";
  }
  if (!tiered) return h("ul.tree", rows.map(renderRow));

  const id = compilation.source_id;
  const tiers = tiersOf(rows);
  const items = [
    h(TierGap, {
      key: "gap-top",
      target: {
        compilation_id: id,
        kind: "gap",
        above: null,
        below: tiers[0]?.priority ?? null,
      },
    }),
  ];
  tiers.forEach((tier, i) => {
    const below = tiers[i + 1]?.priority ?? null;
    items.push(
      h("li.tier", { key: `tier-${tier.priority}` }, [
        h(TierLabel, {
          target: { compilation_id: id, kind: "tier", priority: tier.priority },
        }),
        h("ul.tier-members", tier.rows.map(renderRow)),
      ]),
      h(TierGap, {
        key: `gap-${tier.priority}`,
        target: {
          compilation_id: id,
          kind: "gap",
          above: tier.priority,
          below,
        },
      })
    );
  });
  return h("ul.tree.tiered", items);
}

function TierLabel({ target }: { target: DropTarget }) {
  const drop = useDropTarget(target);
  let label = "unranked";
  if (target.kind === "tier" && target.priority != null) {
    label = `priority ${target.priority}`;
  }
  return h(
    "div.tier-label",
    { ...drop.props, className: drop.className },
    h("span.tier-priority", label)
  );
}

/** Where a new tier goes. Only takes up room while something is being dragged. */
function TierGap({ target }: { target: DropTarget }) {
  const editor = useEditor();
  const dragging = useAtomValue(editor?.dragging ?? noDrag);
  const drop = useDropTarget(target);
  if (dragging == null) return h("li.tier-gap");
  return h(
    "li.tier-gap.active",
    { ...drop.props, className: drop.className },
    h("span", "new tier")
  );
}

/** The row: draggable while editing, and a drop target. Dropped on a
 * compilation, a map goes into it; dropped on a map, it joins that map's tier. */
function NodeRow({ node, edge, children }) {
  const editor = useEditor();
  const editing = useEditing();
  const setDragging = useSetAtom(editor?.dragging ?? noDrag);

  let target: DropTarget | null = null;
  if (node.is_compilation) {
    target = { compilation_id: node.source_id, kind: "into" };
  } else if (edge != null) {
    target = {
      compilation_id: edge.compilation_id,
      kind: "tier",
      priority: edge.priority,
    };
  }
  const drop = useDropTarget(target);

  if (!editing) return h("div.node-row", children);

  // Any row can be dragged, a top-level compilation included: it belongs to
  // nothing, so dropping it adds a membership rather than moving one (`from` is
  // null) -- how a newly materialized `bc-surface` goes into `carto-large`. A
  // drop that would close a cycle is refused where it lands.
  return h(
    "div.node-row.editable",
    {
      draggable: true,
      onDragStart: (evt: DragEvent) => {
        evt.stopPropagation();
        // Firefox starts no drag without data.
        evt.dataTransfer.setData("text/plain", node.slug);
        evt.dataTransfer.effectAllowed = "copyMove";
        setDragging({
          member_id: node.source_id,
          from: edge?.compilation_id ?? null,
        });
      },
      onDragEnd: () => setDragging(null),
      ...drop.props,
      className: drop.className,
    },
    [
      h("span.drag-handle", { title: "Drag to move; hold Alt to copy" }, "⠿"),
      ...children,
    ]
  );
}

function RemoveButton({ node, edge }) {
  const editor = useEditor();
  const editing = useEditing();
  const remove = useSetAtom(editor?.removeMember ?? noRemove);
  if (!editing || edge == null) return null;
  return h(Button, {
    minimal: true,
    small: true,
    icon: "cross",
    className: "remove-member",
    title: "Remove from this compilation",
    onClick: () => remove(edge.compilation_id, node.source_id),
  });
}

/** Drop handling for one target. Alt (Option) copies rather than moves, which
 * is the browser's own convention for a copying drag. */
function useDropTarget(target: DropTarget | null) {
  const editor = useEditor();
  const dragging = useAtomValue(editor?.dragging ?? noDrag);
  const setDragging = useSetAtom(editor?.dragging ?? noDrag);
  const drop = useSetAtom(editor?.drop ?? noDrop);
  const [over, setOver] = useState(false);

  if (dragging == null || target == null) {
    return { props: {}, className: undefined };
  }

  let className = "drop-target";
  if (over) className = "drop-target drop-over";

  const props = {
    onDragOver: (evt: DragEvent) => {
      evt.preventDefault();
      evt.stopPropagation();
      let effect: "copy" | "move" = "move";
      if (evt.altKey) effect = "copy";
      evt.dataTransfer.dropEffect = effect;
      if (!over) setOver(true);
    },
    onDragLeave: (evt: DragEvent) => {
      const next = evt.relatedTarget as Node | null;
      if (next != null && (evt.currentTarget as Node).contains(next)) return;
      setOver(false);
    },
    onDrop: (evt: DragEvent) => {
      evt.preventDefault();
      evt.stopPropagation();
      setOver(false);
      drop({ item: dragging, target, copy: evt.altKey });
      setDragging(null);
    },
  };
  return { props, className };
}

/** Expansion that follows the tree's own cues until the reader overrides it.
 *
 * Two cues, which differ in how long they last. `reveal` — the selection is
 * somewhere below — opens the branch and leaves it open: the route to the
 * selection can vanish under the reader (an edit removes the selected map from
 * its compilation), and a branch that closed then would collapse the tree out
 * from under them. `filtering` opens every surviving branch only while the
 * filter is on, since those branches were opened by the search, not the reader.
 * A click overrides either. */
function useDisclosure({
  filtering,
  reveal,
}: {
  filtering: boolean;
  reveal: boolean;
}) {
  const [isOpenByHand, setOpenByHand] = useState(reveal);
  const [filterOverride, setFilterOverride] = useState<boolean | null>(null);

  useEffect(() => {
    if (reveal) setOpenByHand(true);
  }, [reveal]);

  useEffect(() => {
    setFilterOverride(null);
  }, [filtering]);

  let isOpen = isOpenByHand;
  if (filtering) isOpen = filterOverride ?? true;

  const toggle = () => {
    if (filtering) {
      setFilterOverride(!isOpen);
    } else {
      setOpenByHand(!isOpen);
    }
  };

  return { isOpen, toggle };
}

/** The secondary line. Priority leads, since it is what decides a collision;
 * in edit mode the tier carries it instead. */
function NodeStats({
  node,
  priority,
}: {
  node: GraphNode;
  priority: number | null;
}) {
  const parts: string[] = [];
  if (priority != null) parts.push(`priority ${priority}`);
  parts.push(`${node.slug} #${node.source_id}`);

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

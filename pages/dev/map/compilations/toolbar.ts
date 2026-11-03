/** The page's toolbar: search and filters, the focus and location as clearable
 * tags, and — for an admin — the edit controls. */

import { Spinner, Switch, Tag } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { useAtom, useAtomValue } from "jotai";
import type { ReactNode } from "react";
import { useIsAdmin } from "~/_utils/is-admin";

import {
  formatArea,
  nodeName,
  ScaleFilter,
  TreeSearch,
  type GraphNode,
} from "~/components/compilation-tree";

import { EditControls } from "./editor";
import {
  focusNodeAtom,
  focusSlugAtom,
  pointAtom,
  pointGraphAtom,
  treeAtoms,
  type Point,
} from "./state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function CompilationToolbar() {
  const isAdmin = useIsAdmin();
  const [servedAtTop, setServedAtTop] = useAtom(treeAtoms.servedAtTop);

  let editControls = null;
  if (isAdmin) editControls = h(EditControls);

  return h("div.compilation-toolbar", [
    h("div.toolbar-search", h(TreeSearch, { atoms: treeAtoms })),
    h(ScaleFilter, { atoms: treeAtoms }),
    h(Switch, {
      className: "served-switch",
      label: "Served at top level",
      checked: servedAtTop,
      onChange: () => setServedAtTop(!servedAtTop),
    }),
    h(FocusTag),
    h(PointTag),
    h("div.toolbar-spacer"),
    editControls,
  ]);
}

/** The focused compilation, whose tree is the only one shown. */
function FocusTag() {
  const [slug, setFocus] = useAtom(focusSlugAtom);
  const node = useAtomValue(focusNodeAtom);
  if (slug == null) return null;

  // A slug outside the point's graph has no node, but is still focused.
  let label = slug;
  let title: string | undefined = undefined;
  if (node != null) {
    label = nodeName(node);
    title = focusStats(node);
  }

  return h(
    Tag,
    {
      icon: "layers",
      intent: "primary",
      minimal: true,
      size: "large",
      title,
      onRemove: () => setFocus(null),
    },
    label
  );
}

/** A leaf map has no members, so only a compilation gets a membership line. */
function focusStats(node: GraphNode) {
  const parts: string[] = [`${node.slug} #${node.source_id}`];
  if (node.is_compilation) {
    parts.push(`${node.n_members} members`);
    if (node.n_sources !== node.n_members) {
      parts.push(`${node.n_sources} maps`);
    }
  }
  if (node.is_standalone) {
    parts.push("in no compilation");
  }
  const area = formatArea(node.area_km);
  if (area != null) parts.push(area);
  return parts.join(" · ");
}

/** The inspected point, which narrows the tree to the maps covering it. */
function PointTag() {
  const [point, setPoint] = useAtom(pointAtom);
  const graph = useAtomValue(pointGraphAtom);
  if (point == null) return null;

  let icon: ReactNode = h(Spinner, { size: 12 });
  let title = "Loading the maps at this point…";
  if (graph != null) {
    const compilations = graph.nodes.filter((n) => n.is_compilation).length;
    const maps = graph.nodes.length - compilations;
    icon = "map-marker";
    title = `${maps} maps in ${compilations} compilations cover this point`;
  }

  return h(
    Tag,
    {
      icon,
      minimal: true,
      size: "large",
      title,
      onRemove: () => setPoint(null),
    },
    formatCoordinates(point)
  );
}

function formatCoordinates({ lng, lat }: Point) {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}°${ns}, ${Math.abs(lng).toFixed(3)}°${ew}`;
}

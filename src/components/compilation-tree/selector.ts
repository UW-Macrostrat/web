/** The compilation hierarchy as a *control* rather than a panel.
 *
 * The tree is how you find a compilation; it is not what you want to keep
 * looking at once you have. So it lives in a popover behind a button that names
 * the current selection, and the panel keeps only what stays useful: where the
 * selection sits in the hierarchy, and what it is.
 */

import { Button, PopoverNext } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useState, type ReactNode } from "react";

import { nodeName } from "./graph";
import { formatArea, NodeTags } from "./node-tags";
import type { CompilationTreeAtoms } from "./state";
import { CompilationTree } from "./tree";
import styles from "./tree.module.sass";

const h = hyper.styled(styles);

export interface CompilationSelectorProps {
  atoms: CompilationTreeAtoms;
  /** Shown in the popover instead of the tree — a spinner or an error callout
   * while the graph is on its way. */
  status?: ReactNode;
  /** Extra controls beneath the popover's search box. */
  toolbar?: ReactNode;
  showStandalone?: boolean;
  /** Text on the button when nothing is selected. */
  placeholder?: string;
}

export function CompilationSelector({
  atoms,
  status = null,
  toolbar = null,
  showStandalone = true,
  placeholder = "Select a compilation…",
}: CompilationSelectorProps) {
  const [isOpen, setOpen] = useState(false);
  const [slug, setSlug] = useAtom(atoms.focusSlug);
  const node = useAtomValue(atoms.focusNode);

  // Picking something is the end of the errand the popover was opened for.
  const onSelect = useCallback(() => setOpen(false), []);

  let content = status;
  if (content == null) {
    content = h(
      "div.tree-popover",
      h(CompilationTree, { atoms, toolbar, showStandalone, onSelect })
    );
  }

  // Before the graph arrives a slug from the URL is all we have, and showing it
  // beats showing the placeholder for something that *is* selected.
  let label = placeholder;
  if (node != null) {
    label = nodeName(node);
  } else if (slug != null) {
    label = slug;
  }

  let clearButton = null;
  if (slug != null) {
    clearButton = h(Button, {
      minimal: true,
      small: true,
      icon: "cross",
      title: "Show the whole topology",
      onClick: () => setSlug(null),
    });
  }

  return h("div.compilation-selector", [
    h(PopoverNext, {
      className: "selector-popover-target",
      minimal: true,
      placement: "bottom-start",
      isOpen,
      onInteraction: (nextOpen) => setOpen(nextOpen),
      content,
      renderTarget: ({ isOpen: open, ...targetProps }) =>
        h(
          Button,
          {
            ...targetProps,
            fill: true,
            alignText: "start",
            active: open,
            rightIcon: "caret-down",
            title: "Choose a compilation",
          },
          label
        ),
    }),
    clearButton,
  ]);
}

/** Where the selection sits in the hierarchy: the route down to it, each step
 * selectable in its own right.
 *
 * The graph is a DAG, so a node can be reached more than one way; this is the
 * shortest route, which is the one that explains the selection rather than
 * enumerating its provenance. */
export function CompilationPath({ atoms }: { atoms: CompilationTreeAtoms }) {
  const path = useAtomValue(atoms.focusPath);
  const [, setFocus] = useAtom(atoms.focusSlug);

  const ancestors = path.slice(0, -1);
  if (ancestors.length === 0) return null;

  const steps = [];
  for (const node of ancestors) {
    if (steps.length > 0) {
      steps.push(h("span.path-separator", { key: `sep-${node.source_id}` }, "›"));
    }
    steps.push(
      h(
        Button,
        {
          key: node.source_id,
          minimal: true,
          small: true,
          onClick: () => setFocus(node.slug),
          title: `Select ${nodeName(node)}`,
        },
        nodeName(node)
      )
    );
  }

  return h("div.compilation-path", steps);
}

/** What the selection *is*: the derived facts that place it in the compilation
 * system, in the same vocabulary the tree uses. */
export function CompilationSummary({ atoms }: { atoms: CompilationTreeAtoms }) {
  const node = useAtomValue(atoms.focusNode);
  if (node == null) return null;

  const parts: string[] = [node.slug];

  if (node.n_members > 0) {
    parts.push(`${node.n_members} members`);
    if (node.n_sources !== node.n_members) {
      parts.push(`${node.n_sources} maps`);
    }
  }

  const area = formatArea(node.area_km);
  if (area != null) parts.push(area);

  return h("div.compilation-summary", [
    h(NodeTags, { node }),
    h("div.node-stats", parts.join(" · ")),
  ]);
}

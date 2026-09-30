/** Every ingested map, filterable to the ones in a supersession relation.
 *
 * A flat list rather than the compilation tree: supersession runs across the
 * hierarchy (a state map superseded by a national compilation), so nesting by
 * membership would scatter the pairs this page is about.
 */

import { Button, InputGroup, NonIdealState, Tag } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { useAtom, useAtomValue } from "jotai";

import { nodeName, type GraphNode } from "~/components/compilation-tree";

import {
  listedNodesAtom,
  listFilterAtom,
  nodesByIdAtom,
  searchTextAtom,
  selectedSlugAtom,
  supersededByIdAtom,
  type ListFilter,
} from "./state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

const filters: { value: ListFilter; label: string }[] = [
  { value: "all", label: "All maps" },
  { value: "superseded", label: "Superseded" },
  { value: "superseding", label: "Superseding" },
];

export function SourceList() {
  const nodes = useAtomValue(listedNodesAtom);

  let body = h(
    "ul.source-list",
    nodes.map((node) => h(SourceRow, { key: node.source_id, node }))
  );
  if (nodes.length === 0) {
    body = h(NonIdealState, {
      icon: "search",
      title: "Nothing here",
      description: "No map matches. Clear the search or the filter.",
    });
  }

  return h("div.source-list-panel", [h(ListToolbar), body]);
}

function ListToolbar() {
  const [text, setText] = useAtom(searchTextAtom);
  const [filter, setFilter] = useAtom(listFilterAtom);

  let clearButton = undefined;
  if (text !== "") {
    clearButton = h(Button, {
      minimal: true,
      icon: "cross",
      onClick: () => setText(""),
    });
  }

  return h("div.list-toolbar", [
    h(InputGroup, {
      leftIcon: "search",
      placeholder: "Search maps…",
      value: text,
      onChange: (evt) => setText(evt.currentTarget.value),
      rightElement: clearButton,
    }),
    h(
      "div.list-filter",
      filters.map((f) => {
        const active = filter === f.value;
        let intent: "primary" | "none" = "none";
        if (active) intent = "primary";
        return h(
          Button,
          {
            key: f.value,
            small: true,
            minimal: !active,
            intent,
            onClick: () => setFilter(f.value),
          },
          f.label
        );
      })
    ),
  ]);
}

function SourceRow({ node }: { node: GraphNode }) {
  const [selected, setSelected] = useAtom(selectedSlugAtom);
  const byId = useAtomValue(nodesByIdAtom);
  const superseding = useAtomValue(supersededByIdAtom);

  const isSelected = selected === node.slug;
  let className = undefined;
  if (isSelected) className = "selected";

  const tags = [];
  if (node.scale != null) {
    tags.push(h(Tag, { key: "scale", minimal: true }, node.scale));
  }
  if (node.is_compilation) {
    tags.push(h(Tag, { key: "compilation", minimal: true }, "compilation"));
  }
  if (node.superseded_by != null) {
    const by = byId.get(node.superseded_by)?.slug ?? `#${node.superseded_by}`;
    tags.push(
      h(
        Tag,
        { key: "superseded", minimal: true, intent: "warning" },
        `superseded by ${by}`
      )
    );
  }
  const replaced = superseding.get(node.source_id) ?? [];
  if (replaced.length > 0) {
    tags.push(
      h(
        Tag,
        { key: "supersedes", minimal: true, intent: "success" },
        `supersedes ${replaced.length}`
      )
    );
  }

  const toggle = () => {
    let next: string | null = node.slug;
    if (isSelected) next = null;
    setSelected(next);
  };

  return h("li.source-row", { className }, [
    h("button.source-name", { onClick: toggle }, nodeName(node)),
    h("div.source-meta", [h("span.source-slug", node.slug), ...tags]),
  ]);
}

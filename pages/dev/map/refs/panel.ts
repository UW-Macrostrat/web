/** The list of references and its filters. */
import { InputGroup, Switch, Tag } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import { useAtom, useAtomValue } from "jotai";

import { problemsOf, type Reference } from "./api";
import {
  onlyProblemsAtom,
  searchAtom,
  selectedIdAtom,
  showAllAtom,
  visibleRefsAtom,
} from "./state";
import styles from "./main.module.sass";

const h = hyper.styled(styles);

export function RefToolbar() {
  const [search, setSearch] = useAtom(searchAtom);
  const [showAll, setShowAll] = useAtom(showAllAtom);
  const [onlyProblems, setOnlyProblems] = useAtom(onlyProblemsAtom);
  const count = useAtomValue(visibleRefsAtom).length;

  return h("div.ref-toolbar", [
    h(InputGroup, {
      className: "toolbar-search",
      leftIcon: "search",
      placeholder: "Author, citation or id",
      value: search,
      onChange: (evt) => setSearch(evt.target.value),
    }),
    h(Switch, {
      className: "toolbar-switch",
      label: "Without geometry too",
      checked: showAll,
      onChange: (evt) => setShowAll(evt.currentTarget.checked),
    }),
    h(Switch, {
      className: "toolbar-switch",
      label: "Problems only",
      checked: onlyProblems,
      onChange: (evt) => setOnlyProblems(evt.currentTarget.checked),
    }),
    h("span.toolbar-count", `${count} references`),
  ]);
}

export function RefList() {
  const refs = useAtomValue(visibleRefsAtom);
  const [selected, setSelected] = useAtom(selectedIdAtom);

  return h(
    "ul.ref-list",
    refs.map((ref) =>
      h(RefRow, {
        key: ref.id,
        ref_: ref,
        selected: ref.id === selected,
        onSelect: () => setSelected(ref.id),
      })
    )
  );
}

function RefRow({ ref_, selected, onSelect }) {
  const ref: Reference = ref_;
  let className = null;
  if (selected) className = "selected";

  return h("li.ref-row", { className, onClick: onSelect }, [
    h("div.ref-heading", [
      h("span.ref-id", `#${ref.id}`),
      h("span.ref-author", `${ref.author} (${ref.pub_year})`),
    ]),
    h("div.ref-tags", [
      ...problemsOf(ref).map((p) =>
        h(Tag, { key: p.label, minimal: true, intent: p.intent }, p.label)
      ),
      h("span.ref-names", `${ref.n_strat_names} names`),
    ]),
  ]);
}

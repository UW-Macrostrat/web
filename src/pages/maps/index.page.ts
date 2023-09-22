import h from "@macrostrat/hyper";
// Page for a list of maps

export function Page({ sources }) {
  return h("div", [
    h("h1", "Maps"),
    h(
      "ul",
      sources.map((d) => h(SourceItem, { source: d, key: d.source_id }))
    ),
  ]);
}

function SourceItem({ source }) {
  const { source_id, name } = source;
  const href = `/maps/${source_id}`;
  return h("li", [
    h("span.source-id", {}, source_id),
    " ",
    h("a", { href }, [name]),
    " ",
    h("span.scale", {}, source.scale),
  ]);
}

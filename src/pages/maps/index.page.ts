import h from "@macrostrat/hyper";
// Page for a list of maps

export function Page({ sources }) {
  console.log(sources.sort((a, b) => a.source_id - b.source_id));
  return h("div", [h("h1", "Maps"), h("p", "This is a list of maps")]);
}

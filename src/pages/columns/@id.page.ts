import h from "@macrostrat/hyper";

export function Page({ units, col_id }) {
  return h("div", [
    "Column " + col_id,
    h("pre", JSON.stringify(units, null, 2)),
  ]);
}

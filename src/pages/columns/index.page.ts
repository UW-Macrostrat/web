import h from "@macrostrat/hyper";

export function Page({ columnGroups }) {
  return h("div", [
    h("h1", "Columns"),
    columnGroups.map((d) => h(ColumnGroup, { data: d, key: d.id })),
  ]);
}

function ColumnGroup({ data }) {
  const { id, name, columns } = data;
  return h("div.column-group", [
    h("h2.column-group", name),
    h(
      "ul",
      columns.map((data) => h(ColumnItem, { data, key: data.col_id }))
    ),
  ]);
}

function ColumnItem({ data }) {
  const { col_id, col_name } = data;
  const href = `/columns/${col_id}`;
  return h("li", [
    h("span.col-id", {}, col_id),
    " ",
    h("a", { href }, [col_name]),
  ]);
}

import h from "@macrostrat/hyper";
import { ContentPage } from "~/layouts";
import { PageHeader, Link } from "~/components";
import { Tag } from "@blueprintjs/core";

export function Page({ columnGroups, title = "Columns", linkPrefix = "/" }) {
  return h(ContentPage, [
    h(PageHeader, { title }),
    columnGroups.map((d) => h(ColumnGroup, { data: d, key: d.id, linkPrefix })),
  ]);
}

function ColumnGroup({ data, linkPrefix }) {
  const { id, name, columns } = data;
  return h("div.column-group", [
    h("h2.column-group", name),
    h(
      "ul",
      columns.map((data) =>
        h(ColumnItem, { data, key: data.col_id, linkPrefix })
      )
    ),
  ]);
}

function ColumnItem({ data, linkPrefix = "/" }) {
  const { col_id, col_name } = data;
  const href = linkPrefix + `columns/${col_id}`;
  return h("li", [
    h("span.col-id", {}, col_id),
    " ",
    h(Link, { href }, [col_name]),
    h.if(data.status == "in process")([
      " ",
      h(Tag, { minimal: true }, "in process"),
    ]),
  ]);
}

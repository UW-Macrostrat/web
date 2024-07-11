import h from "@macrostrat/hyper";
import { ContentPage } from "~/layouts";
import { PageHeader, Link, AssistantLinks, DevLinkButton } from "~/components";
import { AnchorButton, Tag } from "@blueprintjs/core";
import { usePageProps } from "~/renderer";

export function Page() {
  const { columnGroups, title, linkPrefix } = usePageProps();

  return h(ContentPage, [
    h(AssistantLinks, [
      h(AnchorButton, { href: "/projects", minimal: true }, "Projects"),
      h(DevLinkButton, { href: "/columns/correlation" }, "Correlation chart"),
    ]),
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
    h.if(data.status == "obsolete")([
      " ",
      h(Tag, { minimal: true, intent: "danger" }, "obsolete"),
    ]),
    h.if(data?.t_units == 0)([
      " ",
      h(Tag, { minimal: true, intent: "warning" }, "empty"),
    ]),
  ]);
}

import { ContentPage } from "~/layouts";
import { PageHeader, Link, AssistantLinks, DevLinkButton } from "~/components";
import { Divider, AnchorButton, Tag, Card, Collapse, Icon } from "@blueprintjs/core";
import { useData } from "vike-react/useData";
import { useState } from "react";
import h from "./main.module.scss";

export function Page(props) {
  return h(ColumnListPage, props);
}

function ColumnListPage({ title = "Columns", linkPrefix = "/" }) {
  const { columnGroups } = useData();
  
  return h('div.column-list-page', [
    h(AssistantLinks, [
      h(AnchorButton, { href: "/projects", minimal: true }, "Projects"),
      h(DevLinkButton, { href: "/columns/correlation" }, "Correlation chart"),
    ]),
    h(ContentPage, [
      h(PageHeader, { title }),
      h('div.column-groups', 
        columnGroups.map((d) => h(ColumnGroup, { data: d, key: d.id, linkPrefix })),
      )
    ])
  ]);
}

function ColumnGroup({ data, linkPrefix }) {
  const [isOpen, setIsOpen] = useState(false);

  const { id, name, columns } = data;
  return h(Card, { className: 'column-group', onClick : () => setIsOpen(!isOpen) }, [
    h('div.column-group-header', [
      h("h2.column-group-name", name),
      h(Icon, { 
        icon: isOpen ? "chevron-up" : "chevron-down",
      }),
    ]),
    h(Collapse, { isOpen }, 
      h(
        "div.column-list", [
          h(Divider),
          columns.map((data) =>
            h(ColumnItem, { data, key: data.col_id, linkPrefix })
          )
        ]
        
      )
    ),
  ]);
}

function ColumnItem({ data, linkPrefix = "/" }) {
  const { col_id, col_name } = data;
  const href = linkPrefix + `columns/${col_id}`;
  return h("div", [
    h("span.col-id", "#" + col_id),
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

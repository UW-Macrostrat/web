import h from "./main.module.scss";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";
import { LinkCard, PageBreadcrumbs } from "~/components";
import { Card, Icon, Divider } from "@blueprintjs/core";
import { useState } from "react";
import { ContentPage } from "~/layouts";


export function Page() {
    const [input, setInput] = useState("");
    const res = useAPIResult(SETTINGS.apiV2Prefix + "/defs/groups?all")?.success.data;

    if (res == null) return h("div", "Loading...");

    const handleChange = (event) => { 
        setInput(event.target.value.toLowerCase());
    }

    const filtered = res.filter((d) => {
        const name = d.name.toLowerCase();
        const col_group = d.col_group.toLowerCase();
        return name.includes(input) || col_group.includes(input);
    });

    return h(ContentPage, { className: 'group-list-page'}, [
      h(PageBreadcrumbs, { title: "Column Groups" }),
      h(Card, { className: 'filters' }, [
        h('h3', "Filters"),
        h('div.search-bar', [
          h(Icon, { icon: "search" }),
          h('input', {
            type: "text",
            placeholder: "Search groups...",
            onChange: handleChange,
          }),
        ])
      ]),  
      h(Divider),
      h('div.group-list', [
            filtered.map((d) => {
              return h(GroupItem, { data: d });
            })
      ])
    ]);
}

function GroupItem({ data }) {
  const { name, col_group, col_group_id } = data;

  return h(LinkCard, { href: "/lex/group/" + col_group_id}, [
    h('h3', name),
    h('p', col_group),
  ])
}


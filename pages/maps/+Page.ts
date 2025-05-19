import h from "./main.module.scss";
import { AnchorButton, Icon, Card } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import { PageHeader, DevLinkButton, AssistantLinks, LinkCard } from "~/components";
import { useData } from "vike-react/useData";
import { useState } from "react";

export function Page() {
  const { sources } = useData();
  const [inputValue, setInputValue] = useState("");

  const filteredSources = sources.filter((source) => {
    const name = source.name.toLowerCase();
    const slug = source.slug.toLowerCase();
    const input = inputValue.toLowerCase();
    return name.includes(input) || slug.includes(input);
  });

  console.log("inputValue", inputValue);

  const handleInputChange = (event) => {
    setInputValue(event.target.value.toLowerCase());
  }


  return h('div.maps-page', [
    h(AssistantLinks, [
      h(
        AnchorButton,
        { icon: "flows", href: "/maps/ingestion" },
        "Ingestion system"
      ),
      h(AnchorButton, { icon: "map", href: "/map/sources" }, "Show on map"),
      h(DevLinkButton, { href: "/maps/legend" }, "Legend table"),
    ]),
    h(ContentPage, [
      h(PageHeader, { title: "Maps" }),
      h(Card, { className: "search-bar" },  [
        h(Icon, { icon: "search" }),
        h('input', {
          type: "text",
          placeholder: "Filter by name...",
          onChange: handleInputChange 
        }),
    ]),
      h(
        "div.maps-list",
        filteredSources.map((source) => h(SourceItem, { source })),
      ),
    ]),
  ]);
}

function SourceItem({ source }) {
  const { source_id, name } = source;
  const href = `/maps/${source_id}`;

  return h(LinkCard, {
    href, 
    title: h('h1', name),
    className: 'item'
  }, [
    h.if(source.raster_url != null)([" ", h("span.raster", "Raster")]),
  ]);
}
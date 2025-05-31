import h from "./main.module.scss";
import { AnchorButton, Icon, Card } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import {
  PageHeader,
  DevLinkButton,
  AssistantLinks,
  LinkCard,
} from "~/components";
import { useState } from "react";
import { useAPIResult } from "@macrostrat/ui-components";
import { SETTINGS } from "@macrostrat-web/settings";

export function Page() {
  const [inputValue, setInputValue] = useState("");
  const sources = useAPIResult(SETTINGS.apiV2Prefix + "/defs/sources?all=true")
    ?.success?.data;

  if (sources == null) {
    return h("div.loading", "Loading sources...");
  }

  console.log("sources", sources[0]);

  const filteredSources = sources.filter((source) => {
    const name = source.name.toLowerCase();
    const input = inputValue.toLowerCase();
    return name.includes(input);
  });

  console.log("inputValue", inputValue);

  const handleInputChange = (event) => {
    setInputValue(event.target.value.toLowerCase());
  };

  return h("div.maps-page", [
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
      h(Card, { className: "search-bar" }, [
        h(Icon, { icon: "search" }),
        h("input", {
          type: "text",
          placeholder: "Filter by name...",
          onChange: handleInputChange,
        }),
      ]),
      h(
        "div.maps-list",
        filteredSources.map((source) => h(SourceItem, { source }))
      ),
    ]),
  ]);
}

function SourceItem({ source }) {
  const { source_id, name, ref_title, url, scale } = source;
  const href = `/maps/${source_id}`;

  return h(
    LinkCard,
    {
      href,
      title: h("div.title", [
        h("h1", name),
        h("div", { className: "size " + scale }, scale),
      ]),
    },
    [h("a", { href: url, target: "_blank" }, ref_title)]
  );
}

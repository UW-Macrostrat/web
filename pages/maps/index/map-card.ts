import h from "./main.module.sass";
import { Identifier } from "~/components";
import { Icon, Tag } from "@blueprintjs/core";
import { createDataCard } from "@macrostrat/data-sheet";

function MapCardContent({ data }) {
  const { source_id, name, ref_title, url, scale, ref_year, ref_source } = data;
  const href = `/maps/${source_id}`;

  return h("div.map-card-content", [
    h("div.title", [
      h("a", { href }, h("h3", name)),
      h("div.scale", [h(Tag, { className: "size " + scale }, scale)]),
    ]),
    h("div.content", [
      h("div.source", [
        h("span", ref_source + ": " + ref_title + " (" + ref_year + ") "),
        h("a", { href: url, target: "_blank" }, h(Icon, { icon: "link" })),
      ]),
      h("div.tags", [h(Identifier, { identifier: source_id })]),
    ]),
  ]);
}

export const MapCard = createDataCard(MapCardContent, {
  className: h["map-card"],
});

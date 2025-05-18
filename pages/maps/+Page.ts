import h from "./main.module.scss";
import { AnchorButton, Icon } from "@blueprintjs/core";
import { ContentPage } from "~/layouts";
import { PageHeader, DevLinkButton, AssistantLinks, LinkCard } from "~/components";
import { useData } from "vike-react/useData";
import { useState } from "react";
import { LinkCard } from "~/components/cards";

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
      h(AnchorButton, [
        h('div.search-bar', [
          h(Icon, { icon: "search" }),
          h('input', {
            type: "text",
            placeholder: "Search",
            onChange: handleInputChange 
          }),
        ])
      ]),
      h(DevLinkButton, { href: "/maps/legend" }, "Legend table"),
    ]),
    h(ContentPage, [
      h(PageHeader, { title: "Maps" }),
      h(
        "div.maps-list",
        filteredSources.map((d) => h(SourceItem, { source: d, key: d.source_id })),
      ),
    ]),
  ]);
}

function SourceItem({ source }) {
  const { source_id, slug, name } = source;
  const href = `/maps/${source_id}`;
  const href1 = `/map/dev/sources/${slug}`;

  return h(LinkCard, {
    href, 
    title: h('div.link-title', [
      h('h1',"#" + source_id + " " + name),
      h("a", { href: href1 }, [
        h('p', "View on map (" + source.scale + ")"),
        h(Icon, { icon: "map" })
      ]),
    ]),
  }, [
    h.if(source.raster_url != null)([" ", h("span.raster", "Raster")]),
  ]);
}

function pageCarousel({page, setPage, numPages}) {
  console.log('numpages', numPages);
    return h('div.pages', 
        h('div.page-container', [
          h('div', { className: "page-btn" }, [
            h('div', { className: page != 0 && numPages != 1 ? 'btn-content' : 'hide',             
                onClick: () => {
                    setPage(page - 1);
                }}, [
              h(Icon, { icon: 'arrow-left' }),
              h('p', "Previous"),
            ])
          ]),
          h('p', 'Page ' + (page + 1)),
          h('div', { className: "page-btn" }, [
            h('div', { className: page < numPages - 1 && numPages != 1 ? 'btn-content' : 'hide',
                onClick: () => {
                    setPage(page + 1);
                }
            }, [
              h('p', "Next"),
              h(Icon, { icon: 'arrow-right' }),
            ])
          ]),
        ])
      );
}
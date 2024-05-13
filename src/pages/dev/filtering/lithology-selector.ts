import hyper from "@macrostrat/hyper";
import { apiV2Prefix } from "@macrostrat-web/settings";

import { useState, useEffect, useMemo } from "react";
import { Button, CompoundTag, MenuItem, Tag } from "@blueprintjs/core";
import { MultiSelect } from "@blueprintjs/select";

import "@blueprintjs/select/lib/css/blueprint-select.css";
import styles from "./main.module.styl";

export const h = hyper.styled(styles);

function LithologyMultiSelect({
  onChange,
  selectedLithologyIds
} : {
  onChange: (lith: number[]) => void,
  selectedLithologyIds: number[]
}) {

  const [lithologies, setLithologies] = useState([]);

  useEffect(() => {
    (async () => {
      const liths = await getLithologies();
      setLithologies(liths?.success?.data);
    })()
  }, []);

  const selectedLithologies = useMemo(() => {
    return lithologies.filter(l => selectedLithologyIds.includes(l.lith_id));
  }, [selectedLithologyIds, lithologies]);

  const _onChange = (lith: Lithology) => {
    if (selectedLithologyIds.includes(lith.lith_id)) {
      onChange(lithologies.filter(l => l !== lith.lith_id));
    } else {
      onChange([...selectedLithologyIds, lith.lith_id]);
    }
  }

  return h(MultiSelect, {
    items: lithologies,
    selectedItems: selectedLithologies,
    itemListPredicate: (query: string, items: Lithology[]) => {
      items = items.filter(l => JSON.stringify(l).toLowerCase().includes(query.toLowerCase()))
      return items
    },
    itemRenderer: (item: Lithology, { handleClick }) => {

      const isActive = selectedLithologies.includes(item.name);

      return h("div.lithology-item",
        {
          style: {
            backgroundColor: item.color
          },
          onClick: handleClick
        },
        [
          h("div", [
            h("div.lithology-title", item.name),
            h("div.lithology-description", [item.class, item.group, item.type].filter(Boolean).join('->')),
          ]),
          isActive ? "Contains" : null
        ]
      );
    },
    tagRenderer: (item: Lithology) => {
      return h(CompoundTag,
        {
          leftContent: h(Tag, {
            style: {backgroundColor: item.color}
          }),
        },
        item.name
      );
    },
    noResults: h(MenuItem, { disabled: true, text: "No results.", roleStructure:"listoption"}),
    onRemove: _onChange,
    onItemSelect: _onChange,
  })
}

async function getLithologies() : Promise<{success: { data: Lithology[]}}> {
  const response = await fetch(`${apiV2Prefix}/defs/lithologies?all`);
  if (response.ok) {
    return response.json();
  }
  throw new Error("Failed to get lithologies");
}

interface Lithology {
  lith_id: number;
  name: string
  type: string
  group: string
  class: string
  color: string
  fill: number
  t_units: number
}

export { LithologyMultiSelect };
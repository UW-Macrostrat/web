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
  selectedLithologyNames,
}: {
  onChange: (lith: string[]) => void;
  selectedLithologyNames: string[];
}) {
  const [lithologies, setLithologies] = useState([]);

  useEffect(() => {
    (async () => {
      const liths = await getLithologies();
      setLithologies(liths);
    })();
  }, []);

  const selectedLithologies = useMemo(() => {
    return lithologies.filter((l) => selectedLithologyNames.includes(l.name));
  }, [selectedLithologyNames, lithologies]);

  const _onChange = (lith: Lithology) => {
    if (selectedLithologyNames.includes(lith.name)) {
      onChange(selectedLithologyNames.filter((l) => l !== lith.name));
    } else {
      onChange([...selectedLithologyNames, lith.name]);
    }
  };

  return h(MultiSelect, {
    items: lithologies,
    selectedItems: selectedLithologies,
    itemListPredicate: (query: string, items: Lithology[]) => {
      items = items.filter((l) =>
        JSON.stringify(l).toLowerCase().includes(query.toLowerCase())
      );
      return items;
    },
    itemRenderer: (item: Lithology, { handleClick }) => {
      const isActive = selectedLithologies.includes(item.name);

      return h(
        "div.lithology-item",
        {
          style: {
            borderColor: item.color,
          },
          onClick: handleClick,
        },
        [
          h("div", [
            h("div.lithology-title", item.name),
            h(
              "div.lithology-description",
              [item.class, item.group, item.type].filter(Boolean).join("->")
            ),
          ]),
          isActive ? "Contains" : null,
        ]
      );
    },
    tagRenderer: (item: Lithology) => {
      return h(
        CompoundTag,
        {
          leftContent: h(Tag, {
            style: { backgroundColor: item.color },
          }),
        },
        item.name
      );
    },
    noResults: h(MenuItem, {
      disabled: true,
      text: "No results.",
      roleStructure: "listoption",
    }),
    onRemove: _onChange,
    onItemSelect: _onChange,
  });
}

async function getLithologies(): Promise<Lithology[]> {
  const response = await fetch(`${apiV2Prefix}/defs/lithologies?all`);
  if (response.ok) {
    let data: Lithology[] = (await response.json()).success.data;

    // Enumerate the lithology tree
    let enumeratedLithologyTree = {};
    for (const lith of data) {
      enumeratedLithologyTree = {
        ...enumeratedLithologyTree,
        ...ascendLithologyTree(lith),
      };
    }

    return Object.values(enumeratedLithologyTree);
  }
  throw new Error("Failed to get lithologies");
}

function ascendLithologyTree(
  lith: Lithology
): Record<string, Partial<Lithology>> {
  let lithTree = {
    [lith.name]: lith,
    [lith.class]: { name: lith.class },
    [lith.group]: { name: lith.group, class: lith.class },
    [lith.type]: { name: lith.type, group: lith.group, class: lith.class },
  };

  delete lithTree[""];

  return lithTree;
}

interface Lithology {
  name: string;
  type: string;
  group: string;
  class: string;
  color: string;
}

export { LithologyMultiSelect };

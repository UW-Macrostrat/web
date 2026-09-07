import hyper from "@macrostrat/hyper";
import { AgeField, ThicknessField } from "@macrostrat/column-views";
import { DataField } from "@macrostrat/data-components";
import styles from "./index.module.sass";

const h = hyper.styled(styles);

export function ColumnExtData({
  columnInfo,
  onSelectFacet,
}: {
  columnInfo: any;
  onSelectFacet?: (facet: string) => void;
}) {
  const formattedArea = Math.round(columnInfo.area).toLocaleString();
  return h("div.column-data", [
    h(ThicknessField, { unit: columnInfo }),
    h(AgeField, { unit: columnInfo }),
    h(DataField, {
      label: "Area",
      value: formattedArea,
      unit: "km²",
    }),
    h(ColumnFossilInfo, {
      collections: columnInfo.pbdb_collections,
      occurrences: columnInfo.pbdb_occs,
      onSelectFacet,
    }),
  ]);
}

/** PBDB counts for the column; each is a link that loads the matching fossils
 * facet beside the column. */
function ColumnFossilInfo({ collections, occurrences, onSelectFacet }) {
  if (!collections && !occurrences) return null;

  const facetLink = (count: number, noun: string, facet: string) => {
    return h(
      "a.facet-link",
      {
        href: "#",
        title: `Show ${noun} beside the column`,
        onClick(evt) {
          evt.preventDefault();
          onSelectFacet?.(facet);
        },
      },
      [h("span.count", count.toLocaleString()), " ", noun]
    );
  };

  const parts = [];
  if (collections) {
    parts.push(facetLink(collections, "collections", "fossil-collections"));
  }
  if (occurrences) {
    if (parts.length > 0) parts.push(", ");
    parts.push(facetLink(occurrences, "occurrences", "fossil-taxa"));
  }

  return h(DataField, {
    row: true,
    label: "Fossils",
    value: h("span.fossil-links", parts),
    unit: "via PBDB",
  });
}

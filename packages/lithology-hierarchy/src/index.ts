import h from "./main.module.sass";
import { nestItems, Lith, nestLithAttributes } from "./nest-data";
import { Hierarchy } from "./simple-hierarchy";
import LexHierarchyInner from "./lex-hierarchy";
import {
  useInteractionProps,
  Tag,
  macrostratIdentifierFields,
  Identifier,
} from "@macrostrat/data-components";
export { Hierarchy };

export { nestItems, nestLithAttributes };

export function MacrostratHierarchyItem({ data }) {
  const props = useInteractionProps(data);
  const ident = macrostratIdentifierFields(data);
  let details = null;
  if (ident) {
    details = h(Identifier, { id: ident[1] });
  }
  return h(Tag, {
    name: data.name,
    color: data.color,
    details,
    ...props,
  });
}

export function LexHierarchy({
  width,
  height,
  data,
  href = null,
  onClick = () => {},
}: {
  width: string | number;
  height: string | number;
  data: Lith[];
  href?: string | null;
  onClick?: () => void;
}) {
  const nestedData = nestItems(data);

  return h("div.flex.row", [
    h("div.example-container", [
      h(LexHierarchyInner, { width, height, data: nestedData, href, onClick }),
    ]),
  ]);
}

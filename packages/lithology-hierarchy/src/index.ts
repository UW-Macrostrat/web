import h from "./main.module.sass";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { Spinner } from "@blueprintjs/core";
import { useAPIResult, ErrorCallout } from "@macrostrat/ui-components";
import { useState } from "react";
import {
  nestLiths,
  nestItems,
  Lith,
  nestLithAttributes,
  LithAttribute,
} from "./nest-data";
import { Hierarchy } from "./simple-hierarchy";
import LexHierarchyInner from "./lex-hierarchy";
import { LithologyTag } from "~/components";
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

export function EnvironmentsHierarchy() {
  const [error, setError] = useState(null);
  const res = useAPIResult(
    `${apiV2Prefix}/defs/environments`,
    {
      all: true,
    },
    { onError: setError }
  );

  if (error != null) {
    return h(ErrorCallout, { error });
  }
  if (res == null) {
    return h(Spinner);
  }
  const environments: Lith[] = res.success.data;

  return h(Hierarchy, {
    data: nestLiths(environments),
    itemComponent: MacrostratHierarchyItem,
  });
}

/** LithAttHierarchyItem */
function LithAttHierarchyItem({ data }) {
  const href = "/lex/lith-atts/" + data.lith_att_id;
  console.log(data);
  return h(LithologyTag, {
    data,
    href,
  });
}

export function LithAttsHierarchy() {
  const [error, setError] = useState(null);
  const res = useAPIResult(
    `${apiV2Prefix}/defs/lithology_attributes`,
    {
      all: true,
    },
    { onError: setError }
  );

  if (error != null) {
    return h(ErrorCallout, { error });
  }
  if (res == null) {
    return h(Spinner);
  }
  const atts: LithAttribute[] = res.success.data;

  return h(Hierarchy, {
    data: nestLithAttributes(atts),
    itemComponent: LithAttHierarchyItem,
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

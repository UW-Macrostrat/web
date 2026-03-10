import h from "./main.module.sass";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { Spinner } from "@blueprintjs/core";
import { useAPIResult, ErrorCallout } from "@macrostrat/ui-components";
import { useState } from "react";
import { nestLiths, nestItems, Lith, nestLithAttributes } from "./nest-data";
import Hierarchy from "./simple-hierarchy";
import LexHierarchyInner from "./lex-hierarchy";

export function LithologyHierarchy() {
  const [error, setError] = useState(null);
  const res = useAPIResult(
    `${apiV2Prefix}/defs/lithologies`,
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
  const liths: Lith[] = res.success.data;

  return h(Hierarchy, { data: nestLiths(liths) });
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

  return h(Hierarchy, { data: nestLiths(environments) });
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
  const liths: Lith[] = res.success.data;

  return h(Hierarchy, { data: nestLithAttributes(liths) });
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

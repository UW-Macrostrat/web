import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { Spinner } from "@blueprintjs/core";
import { useAPIResult, ErrorCallout } from "@macrostrat/ui-components";
import { useState } from "react";
import { nestLiths, nestItems, Lith } from "./nest-data";
import Hierarchy from "./simple-hierarchy";
import LexHierarchyInner from "./lex-hierarchy";

const h = hyper.styled(styles);

export default function MacrostratLithologyHierarchy({ width, height }) {
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

  console.log("Liths", liths);

  return h(Hierarchy, { data: nestLiths(liths) });
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

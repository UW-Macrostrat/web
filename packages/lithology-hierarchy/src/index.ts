import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { Spinner } from "@blueprintjs/core";
import { useAPIResult, ErrorCallout } from "@macrostrat/ui-components";
import { useState } from "react";
import { nestLiths, Lith } from "./nest-data";
import Hierarchy from "./simple-hierarchy";

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
  //if (liths.error) const data = liths?.success?.data;
  console.log("Test");
  if (error != null) {
    return h(ErrorCallout, { error });
  }
  if (res == null) {
    return h(Spinner);
  }
  const liths: Lith[] = res.success.data;

  return h("div.flex.row", [
    h("div.example-container", [
      h(Hierarchy, { width, height, data: nestLiths(liths) }),
    ]),
  ]);
}

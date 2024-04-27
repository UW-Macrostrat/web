import hyper from "@macrostrat/hyper";
import styles from "./main.module.sass";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { Spinner } from "@blueprintjs/core";
import { ThreeColumnLayout } from "@macrostrat/ui-components";
import {
  useAPIResult,
  ErrorCallout,
  JSONView,
} from "@macrostrat/ui-components";
import { useState } from "react";
import Example from "./example";

const h = hyper.styled(styles);

export default function MacrostratLithologyHierarchy() {
  const [error, setError] = useState(null);
  const res = useAPIResult(
    `${apiV2Prefix}/defs/lithologies`,
    {
      all: true,
    },
    { onError: setError }
  );
  //if (liths.error) const data = liths?.success?.data;

  if (error != null) {
    return h(ErrorCallout, { error });
  }
  if (res == null) {
    return h(Spinner);
  }
  const liths = res.success.data;

  return h("div.flex.row", [
    h("div.example-container", h(Example, { width: 800, height: 800 })),
    h(JSONView, { className: "data-viewer", data: liths }),
  ]);
}

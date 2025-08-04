import { useData } from "vike-react/useData";
import h from "./main.module.sass";
import { LexItemPage } from "~/components/lex";
import { usePageContext } from "vike-react/usePageContext";
import { DataField } from "~/components/unit-details";
import { LithologyTag } from "@macrostrat/data-components";
import { fetchAPIData } from "~/_utils";
import { useEffect, useState } from "react";
import { Measurement } from "../+Page.client";

export function Page() {
  const { resData } = useData();

  const id = usePageContext().urlParsed.pathname.split("/")[3];

  const children = [h(Measurement, { data: resData })];

  return LexItemPage({
    children,
    id,
    resData,
    siftLink: "measurements",
    header: h("div.strat-header", [h("h1.strat-title", resData?.sample_name)]),
  });
}
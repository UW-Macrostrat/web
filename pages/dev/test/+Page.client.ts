import {
  ColoredUnitComponent,
  MacrostratDataProvider,
  Column,
} from "@macrostrat/column-views";
import { hyperStyled } from "@macrostrat/hyper";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiV2Prefix } from "@macrostrat-web/settings";
import { PatternProvider } from "~/_providers";
import { navigate } from "vike/client/router";
import { PageBreadcrumbs } from "~/components";
import { onDemand } from "~/_utils";
import styles from "./index.module.sass";
import { CorrelationChart } from "@macrostrat/column-views";


const h = hyperStyled(styles);


const ColumnMap = onDemand(() => import("./map").then((mod) => mod.ColumnMap));

function dsf(props) {
  return h(
    MacrostratDataProvider,
    { baseURL: apiV2Prefix },
    h(PatternProvider, h(ColumnPageInner, props))
  );
}

export function Page() {
  return h("div.page-container", [
          h(ColumnMap, {
            className: "column-map",
            inProcess: true,
            projectID: null,
            selectedColumn: 1,
            onSelectColumn: () => {},
          }),
        ])
}
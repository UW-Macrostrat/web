import h from "@macrostrat/hyper";
import { xDDExpansionPanel } from "@macrostrat/data-components";
import { useAppActions, useAppState } from "#/map/map-interface/app-state";
import { useEffect } from "react";

export function XddExpansionContainer() {
  const runAction = useAppActions();

  const xddInfo = useAppState((state) => state.core.xddInfo);

  useEffect(() => {
    if (xddInfo == null || xddInfo.length == 0)
      runAction({ type: "fetch-xdd" });
  }, [xddInfo]);

  return h(xDDExpansionPanel, {
    data: xddInfo,
  });
}

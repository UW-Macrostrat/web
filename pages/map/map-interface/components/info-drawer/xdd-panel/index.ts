import { Spinner } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import Journal from "./Journal";
import { ExpansionPanel, XddExpansion } from "@macrostrat/map-interface";
import { useAppActions, useAppState } from "#/map/map-interface/app-state";
import { useEffect } from "react";

export function XddExpansionContainer() {
  const runAction = useAppActions();

  const xddInfo = useAppState((state) => state.core.xddInfo);

  useEffect(() => {
    if (xddInfo == null || xddInfo.length == 0)
      runAction({ type: "fetch-xdd" });
  }, [xddInfo]);

  return h(XddExpansion, {
    xddInfo,
  });
}

export function XddExpansion2({ xddInfo }) {
  return h(xDDPanelCore, {
    className: "regional-panel",
    data: xddInfo,
    isFetching: xddInfo == undefined || xddInfo.length === 0,
  });
}

export function xDDPanelCore({ isFetching, data: xddInfo, ...rest }) {
  const groupedData = groupSnippetsByJournal(xddInfo);

  return h(
    ExpansionPanel,
    {
      className: "regional-panel",
      title: "Primary literature",
      helpText: "via xDD",
      ...rest,
    },
    [
      h.if(isFetching)(Spinner),
      h.if(!isFetching && xddInfo.length > 0)([
        Array.from(groupedData.entries())?.map(([journal, snippets]) => {
          return h(Journal, {
            name: journal,
            articles: snippets,
            publisher: snippets[0].publisher,
            key: journal,
          });
        }),
      ]),
    ]
  );
}

function groupSnippetsByJournal(
  snippets: XDDSnippet[]
): Map<string, XDDSnippet[]> {
  const journals = new Map<string, XDDSnippet[]>();
  if (!snippets || snippets.length === 0) {
    return journals;
  }
  for (let snippet of snippets) {
    const { pubname: journal } = snippet;
    if (!journals.has(journal)) {
      journals.set(journal, []);
    }
    journals.get(journal).push(snippet);
  }
  return journals;
}

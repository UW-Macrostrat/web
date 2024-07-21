import { Spinner } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import Journal from "./Journal";
import { ExpansionPanel } from "@macrostrat/map-interface";
import { useAppActions, useAppState } from "#/map/map-interface/app-state";
import { XDDSnippet } from "#/map/map-interface/app-state/handlers/fetch";

export function XddExpansion() {
  const runAction = useAppActions();

  const fetchingXdd = useAppState((state) => state.core.fetchingXdd);
  const xddInfo = useAppState((state) => state.core.xddInfo);

  return h(xDDPanelCore, {
    className: "regional-panel",
    onChange() {
      runAction({ type: "fetch-xdd" });
    },
    data: xddInfo,
    isFetching: fetchingXdd,
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
        Array.from(groupedData.entries()).map(([journal, snippets]) => {
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
  for (let snippet of snippets) {
    const { pubname: journal } = snippet;
    if (!journals.has(journal)) {
      journals.set(journal, []);
    }
    journals.get(journal).push(snippet);
  }
  return journals;
}

import { Spinner } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import Journal from "./Journal";
import { ExpansionPanel } from "../../expansion-panel";
import { useAppActions, useAppState } from "~/map-interface/app-state";
import { XDDSnippet } from "~/map-interface/app-state/handlers/fetch";

function XddExpansion() {
  const runAction = useAppActions();

  const fetchingXdd = useAppState((state) => state.core.fetchingXdd);
  const xddInfo = useAppState((state) => state.core.xddInfo);

  const groupedData = groupSnippetsByJournal(xddInfo);

  return h(
    ExpansionPanel,
    {
      className: "regional-panel",
      onChange() {
        runAction({ type: "fetch-xdd" });
      },
      title: "Primary literature",
      helpText: "via xDD",
    },
    [
      h.if(fetchingXdd)(Spinner),
      h.if(!fetchingXdd && xddInfo.length > 0)([
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

export { XddExpansion };

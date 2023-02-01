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
      h.if(xddInfo.length > 0)([
        Array.from(groupedData.entries()).map(([journal, snippets]) => {
          return h(Journal, {
            name: journal,
            articles: snippets,
            publisher: snippets[0].publisher,
            key: journal,
          });
        }),
      ]),

      // h.if(xddInfo.length > 0)([
      //   xddInfo.map((journal) => {
      //     return h(Journal, { data: journal, key: journal.name });
      //   }),
      // ]),
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

/*
      let parsed = {
        journals: [],
      };
      let articles = {};

      console.log(action.data);

      for (let i = 0; i < action.data.length; i++) {
        let found = false;
        if (articles[action.data[i].docid]) {
          continue;
        } else {
          articles[action.data[i].docid] = true;
        }
        for (let j = 0; j < parsed.journals.length; j++) {
          if (parsed.journals[j].name === action.data[i].journal) {
            parsed.journals[j].articles.push(action.data[i]);
            found = true;
          }
        }

        if (!found) {
          parsed.journals.push({
            name: action.data[i].journal,
            source: action.data[i].publisher,
            articles: [action.data[i]],
          });
        }
      }
*/

export { XddExpansion };

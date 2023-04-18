import Article from "./Article";
import { Divider } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import { SubExpansionPanel } from "@macrostrat/map-interface/src/expansion-panel";
import { XDDSnippet } from "~/map-interface/app-state/handlers/fetch";

function Journal(props) {
  return h("div.journal", [
    h("div.journal-title", [
      h("h2.journal-title-text", [
        props.data.name,
        h("small.journal-source", [props.data.source]),
      ]),
    ]),
    h(Divider),
    props.data.articles.map((article, i) => {
      return h(Article, { key: i, data: article });
    }),
  ]);
}

type JournalProps = {
  articles: XDDSnippet[];
  name: string;
  publisher: string;
};

// Still up for review
function Journal_(props: JournalProps) {
  const { articles, name, publisher } = props;

  const helpText = articles[0].pubname;

  return h(
    SubExpansionPanel,
    {
      title: name,
      helpText: publisher,
      expanded: true,
    },
    [
      articles.map((article, i) => {
        return h(Article, { key: i, data: article });
      }),
    ]
  );
}

export default Journal_;

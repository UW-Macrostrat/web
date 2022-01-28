import Article from "./Article";
import { Divider } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import { ExpansionPanel } from "../expansion-panel";

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

// Still up for review
function Journal_(props) {
  return h("div", { style: { marginTop: "5px" } }, [
    h(
      ExpansionPanel,
      {
        subheader: true,
        title: props.data.name,
        helpText: props.data.source,
        expanded: true,
      },
      [
        props.data.articles.map((article, i) => {
          return h(Article, { key: i, data: article });
        }),
      ]
    ),
  ]);
}

export default Journal_;

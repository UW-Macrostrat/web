import React from "react";
import Article from "./Article";
import Divider from "@material-ui/core/Divider";

function Journal(props) {
  const dividerClasses = {
    root: "gdd-journal-article-divider",
  };
  return (
    <div className="journal">
      <div className="journal-title">
        <h2 className="journal-title-text">
          {props.data.name}{" "}
          <small className="journal-source">{props.data.source}</small>
        </h2>
      </div>
      <Divider classes={dividerClasses} />
      {props.data.articles.map((article) => (
        <Article key={article.docid} data={article} />
      ))}
    </div>
  );
}

export default Journal;

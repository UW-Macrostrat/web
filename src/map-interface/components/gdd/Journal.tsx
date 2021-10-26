import React, { Component } from "react";
import Article from "./Article";
import Divider from "@material-ui/core/Divider";

class Journal extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const dividerClasses = {
      root: "gdd-journal-article-divider",
    };
    return (
      <div className="journal">
        <div className="journal-title">
          <h2 className="journal-title-text">
            {this.props.data.name}{" "}
            <small className="journal-source">{this.props.data.source}</small>
          </h2>
        </div>
        <Divider classes={dividerClasses} />
        {this.props.data.articles.map((article) => (
          <Article key={article.docid} data={article} />
        ))}
      </div>
    );
  }
}

export default Journal;

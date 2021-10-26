import React, { Component } from "react";
import IconButton from "@material-ui/core/IconButton";
import Collapse from "@material-ui/core/Collapse";

import AddBoxIcon from "@material-ui/icons/AddBoxOutlined";
import RemoveCircleOutlinedIcon from "@material-ui/icons/RemoveCircleOutlined";

class Article extends Component {
  constructor(props) {
    super(props);
    this.state = {
      expanded: false,
    };
    this.toggleExpand = this.toggleExpand.bind(this);
  }

  toggleExpand() {
    this.setState({ expanded: !this.state.expanded });
  }

  render() {
    const buttonClasses = {
      root: "expand-button",
    };
    // Attempt to pull out only the year and not the whole date
    let year;
    try {
      year = this.props.data.coverdate
        ? this.props.data.coverdate.match(/\d{4}/)[0]
        : "";
    } catch (e) {
      year = "";
    }

    let authors = this.props.data.hasOwnProperty("authors")
      ? this.props.data.authors
          .map((d) => {
            return d.name;
          })
          .join(", ")
      : "";

    return (
      <div className="article">
        <div className="article-title">
          <p className="article-author">
            {authors ? authors : "Unknown"},{" "}
            {year.length ? " " + year + ". " : ""}
          </p>
          <a href={this.props.data.url} target="_blank" className="title-link">
            <strong>{this.props.data.title}.</strong>
          </a>

          <span>
            <AddBoxIcon
              onClick={this.toggleExpand}
              classes={buttonClasses}
              className={this.state.expanded ? "hidden" : ""}
            />
            <RemoveCircleOutlinedIcon
              onClick={this.toggleExpand}
              classes={buttonClasses}
              className={this.state.expanded ? "" : "hidden"}
            />
          </span>
        </div>
        <Collapse in={this.state.expanded} timeout="auto" unmountOnExit>
          <span className={this.state.expanded ? "" : "hidden"}>
            <div className="quotes">
              {this.props.data.snippets.map((snippet, si) => {
                let text = snippet
                  .replace(/<em class="hl">/g, "@@@")
                  .replace(/<\/em>/g, "***")
                  .replace(/(?:\r\n|\r|\n|\<|\>)/g, " ")
                  .trim()
                  .replace(/@@@/g, '<em class="hl">')
                  .replace(/\*\*\*/g, "</em>");
                return (
                  <p
                    className="gdd-snippet"
                    key={si}
                    dangerouslySetInnerHTML={{ __html: "..." + text + "..." }}
                  ></p>
                );
              })}
            </div>
          </span>
        </Collapse>
      </div>
    );
  }
}

export default Article;

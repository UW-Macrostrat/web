import React, { useState } from "react";
import { Collapse, Button } from "@blueprintjs/core";

function Article(props) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };
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

  let authors = props.data.hasOwnProperty("authors")
    ? props.data.authors
        .map((d) => {
          return d.name;
        })
        .join(", ")
    : "";

  const iconName = expanded ? "chevron-up" : "chevron-down";

  return (
    <div className="article">
      <div className="article-title">
        <p className="article-author">
          {authors ? authors : "Unknown"},{" "}
          {year.length ? " " + year + ". " : ""}
        </p>
        <a href={props.data.url} target="_blank" className="title-link">
          <strong style={{ lineHeight: "24px" }}>{props.data.title}.</strong>
        </a>

        <span>
          <Button onClick={toggleExpand} minimal={true} icon={iconName} />
        </span>
      </div>
      <Collapse isOpen={expanded}>
        <span className={expanded ? "" : "hidden"}>
          <div className="quotes">
            {props.data.snippets.map((snippet, si) => {
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

export default Article;

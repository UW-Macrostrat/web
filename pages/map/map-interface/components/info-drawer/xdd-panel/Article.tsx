import React, { useState } from "react";
import { Collapse, Button } from "@blueprintjs/core";
import { AuthorList } from "@macrostrat/ui-components";
import h from "@macrostrat/hyper";

function Article(props) {
  const [expanded, setExpanded] = useState(false);
  const { data } = props;

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  // Attempt to pull out only the year and not the whole date
  let year;
  try {
    year = data.coverDate ? data.coverDate.match(/\d{4}/)[0] : "";
  } catch (e) {
    year = "";
  }

  const authors = data?.authors?.split("; ") ?? [];

  const authorList =
    authors.length > 0 ? h(AuthorList, { names: authors }) : "Unknown";

  const iconName = expanded ? "chevron-up" : "chevron-down";

  return (
    <div className="article">
      <div className="article-title">
        <p className="article-author">
          {authorList}, {year.length ? " " + year + ". " : ""}
        </p>
        <a href={data.URL} target="_blank" className="title-link">
          <strong>{data.title}.</strong>
        </a>

        <span>
          <Button
            onClick={toggleExpand}
            minimal={true}
            rightIcon={iconName}
            className="flat-btn"
          ></Button>
        </span>
      </div>
      <Collapse isOpen={expanded}>
        <span className={expanded ? "" : "hidden"}>
          <div className="quotes">
            {data.highlight.map((snippet, si) => {
              let text = snippet;

              return (
                <p
                  className="gdd-snippet"
                  key={si}
                  dangerouslySetInnerHTML={{ __html: `...${snippet}...` }}
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

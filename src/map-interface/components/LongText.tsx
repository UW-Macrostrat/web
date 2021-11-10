import { useState } from "react";
import { Button } from "@blueprintjs/core";
import h from "@macrostrat/hyper";

function LongText(props) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  let iconName: any = expanded ? "chevron-up" : "chevron-down";
  let classname = expanded ? "hidden" : "";

  const { name, text } = props;

  return h("div.map-source-attr", [
    h.if(text.length <= 250)([h("span.attr", [name, ":"]), text]),
    h.if(text.length > 250)([
      expanded ? text : text.substr(0, 250),
      h("span", [
        h(`span.${classname}`, ["..."]),
        h(`span`, [
          h(Button, { icon: iconName, onClick: toggleExpand, minimal: true }),
        ]),
      ]),
    ]),
  ]);
}

export default LongText;

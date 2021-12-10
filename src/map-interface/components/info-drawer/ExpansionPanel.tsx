/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import React, { useState } from "react";
import { Collapse, Button, Icon } from "@blueprintjs/core";
import h from "@macrostrat/hyper";
//import h from "@macrostrat/hyper";

const expansionPanelClasses = {
  content: "expansion-panel",
  root: "expansion-panel-root",
};

function ExpansionPanelSummary(props) {
  const { expanded, children, onChange, subheader } = props;
  const showExpand = expanded ? "chevron-up" : "chevron-down";
  const classname = subheader ? "sub-panel-header" : "expansion-panel-header";

  return (
    <div className={classname} onClick={onChange}>
      <div className="title">{children}</div>
      <Icon icon={showExpand} />
    </div>
  );
}

function ExpansionHeader(props) {
  const { onClick, title, helpText, expanded, sideComponent, subheader } =
    props;

  return (
    <ExpansionPanelSummary
      classes={expansionPanelClasses}
      onChange={onClick}
      expanded={expanded}
      subheader={subheader}
    >
      <div className="expansion-summary-title">
        {title}
        <div className="expansion-summary-title-help">
          <span className="via-gdd">{helpText}</span> {sideComponent}
        </div>
      </div>
    </ExpansionPanelSummary>
  );
}

function ExpansionPanel(props) {
  let {
    title,
    children,
    expanded,
    helpText,
    onChange = () => {},
    subheader = false,
    sideComponent = h("div"),
  } = props;
  const [open, setOpen] = useState(expanded || false);

  const onChange_ = () => {
    onChange();
    setOpen(!open);
  };

  return (
    <div className={"expansion-panel"}>
      <ExpansionHeader
        title={title}
        expanded={open}
        onClick={onChange_}
        helpText={helpText}
        sideComponent={sideComponent}
        subheader={subheader}
      />
      <Collapse isOpen={open}>
        <div className="expansion-children">{children}</div>
      </Collapse>
    </div>
  );
}

export { ExpansionPanel, ExpansionPanelSummary };

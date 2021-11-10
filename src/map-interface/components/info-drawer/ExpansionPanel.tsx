/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import React, { useState } from "react";
import { Collapse, Button, Icon } from "@blueprintjs/core";
//import h from "@macrostrat/hyper";

const expansionPanelClasses = {
  content: "expansion-panel",
  root: "expansion-panel-root",
};

function ExpansionPanelSummary(props) {
  const { expanded, children, onChange } = props;
  const showExpand = expanded ? "chevron-up" : "chevron-down";
  return (
    <div className="expansion-panel-header" onClick={onChange}>
      <div className="title">{children}</div>
      <Icon icon={showExpand} />
    </div>
  );
}

function ExpansionHeader(props) {
  const { onClick, title, helpText, expanded } = props;

  return (
    <ExpansionPanelSummary
      classes={expansionPanelClasses}
      onChange={onClick}
      expanded={expanded}
    >
      <div className="expansion-summary-title">
        {title} <span className="via-gdd">{helpText}</span>{" "}
      </div>
    </ExpansionPanelSummary>
  );
}

function ExpansionPanel(props) {
  let { title, children, expanded, helpText, onChange = () => {} } = props;
  const [open, setOpen] = useState(expanded || false);

  const onChange_ = () => {
    onChange();
    setOpen(!open);
  };

  return (
    <div className="expansion-panel">
      <ExpansionHeader
        title={title}
        expanded={open}
        onClick={onChange_}
        helpText={helpText}
      />
      <Collapse isOpen={open}>
        <div className="expansion-children">{children}</div>
      </Collapse>
    </div>
  );
}

export { ExpansionPanel, ExpansionPanelSummary };

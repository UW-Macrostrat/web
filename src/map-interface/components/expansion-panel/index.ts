import { useState } from "react";
import { Collapse, Icon } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.styl";
import classNames from "classnames";
import { PanelSubhead } from "./headers";

const h = hyper.styled(styles);

function ExpansionPanelSummary(props) {
  const { expanded, children, onChange, className, title } = props;
  const showExpand = expanded ? "chevron-up" : "chevron-down";
  return h(
    PanelSubhead,
    {
      className: classNames("expansion-panel-header", className),
      onClick: onChange,
      title,
    },
    [children, h(Icon, { icon: showExpand })]
  );
}

function ExpansionHeader(props) {
  const { onClick, title, helpText, expanded, sideComponent, className } =
    props;

  return h(
    ExpansionPanelSummary,
    {
      onChange: onClick,
      className,
      expanded,
      title,
    },
    h("div.expansion-summary-title-help", [
      h("span.expansion-panel-subtext", helpText),
      " ",
      sideComponent,
    ])
  );
}

function ExpansionPanel(props) {
  let {
    title,
    children,
    expanded,
    helpText,
    onChange = () => {},
    sideComponent = null,
    className,
  } = props;
  const [isOpen, setOpen] = useState(expanded || false);

  const onChange_ = () => {
    onChange();
    setOpen(!isOpen);
  };

  return h(
    "div.expansion-panel",
    { className: classNames(className, { expanded, collapsed: !expanded }) },
    [
      h(ExpansionHeader, {
        title: title,
        expanded: isOpen,
        onClick: onChange_,
        helpText,
        sideComponent,
      }),
      h(Collapse, { isOpen }, h("div.expansion-children", null, children)),
    ]
  );
}

function SubExpansionPanel(props) {
  return h(ExpansionPanel, { ...props, className: "sub-expansion-panel" });
}

export { ExpansionPanel, ExpansionPanelSummary, SubExpansionPanel };

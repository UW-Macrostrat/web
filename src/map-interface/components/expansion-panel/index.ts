import { useState } from "react";
import { Collapse, Icon } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.styl";
import classNames from "classnames";
import { PanelSubhead } from "./headers";

const h = hyper.styled(styles);

function ExpansionPanelSummary(props) {
  const { expanded, children, onChange, className, title, titleComponent } =
    props;
  const showExpand = expanded ? "chevron-up" : "chevron-down";
  return h(
    PanelSubhead,
    {
      className: classNames("expansion-panel-header", className),
      onClick: onChange,
      title,
      component: titleComponent,
    },
    [children, h(Icon, { icon: showExpand })]
  );
}

function ExpansionHeader(props) {
  const {
    onClick,
    title,
    helpText,
    expanded,
    sideComponent,
    className,
    titleComponent,
  } = props;

  return h(
    ExpansionPanelSummary,
    {
      onChange: onClick,
      className,
      expanded,
      title,
      titleComponent,
    },
    h("div.expansion-summary-title-help", [
      h("span.expansion-panel-subtext", helpText),
      " ",
      sideComponent,
    ])
  );
}

function ExpansionPanelBase(props) {
  let {
    title,
    titleComponent = "h3",
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
    "div.expansion-panel-base",
    { className: classNames(className, { expanded, collapsed: !expanded }) },
    [
      h(ExpansionHeader, {
        title: title,
        titleComponent,
        expanded: isOpen,
        onClick: onChange_,
        helpText,
        sideComponent,
      }),
      h(Collapse, { isOpen }, h("div.expansion-children", null, children)),
    ]
  );
}

function ExpansionPanel(props) {
  return h(ExpansionPanelBase, {
    ...props,
    className: "expansion-panel",
  });
}

function SubExpansionPanel(props) {
  return h(ExpansionPanelBase, {
    ...props,
    className: "sub-expansion-panel",
    titleComponent: "h4",
  });
}

export { ExpansionPanel, ExpansionPanelSummary, SubExpansionPanel };

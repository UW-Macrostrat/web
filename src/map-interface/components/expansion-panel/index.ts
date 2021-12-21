import { useState } from "react";
import { Collapse, Icon } from "@blueprintjs/core";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.styl";

const h = hyper.styled(styles);

function ExpansionPanelSummary(props) {
  const { expanded, children, onChange, subheader } = props;
  const showExpand = expanded ? "chevron-up" : "chevron-down";
  const className = subheader ? "sub-panel-header" : "expansion-panel-header";
  return h("div", { className, onClick: onChange }, [
    h("div.title", children),
    h(Icon, { icon: showExpand }),
  ]);
}

function ExpansionHeader(props) {
  const { onClick, title, helpText, expanded, sideComponent, subheader } =
    props;

  return h(
    ExpansionPanelSummary,
    {
      //classes: expansionPanelClasses,
      onChange: onClick,
      expanded: expanded,
      subheader: subheader,
    },
    h("div.expansion-summary-title", [
      title,
      h("div.expansion-summary-title-help", [
        h("span.via-gdd", helpText),
        " ",
        sideComponent,
      ]),
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
    subheader = false,
    sideComponent = h("div"),
  } = props;
  const [isOpen, setOpen] = useState(expanded || false);

  const onChange_ = () => {
    onChange();
    setOpen(!isOpen);
  };

  return h("div.expansion-panel", [
    h(ExpansionHeader, {
      title: title,
      expanded: isOpen,
      onClick: onChange_,
      helpText: helpText,
      sideComponent: sideComponent,
      subheader: subheader,
    }),
    h(Collapse, { isOpen }, h("div.expansion-children", null, children)),
  ]);
}

export { ExpansionPanel, ExpansionPanelSummary };

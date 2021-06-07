import { Component } from "react";
import h from "react-hyperscript";
import { NonIdealState } from "@blueprintjs/core";
import { MacrostratColumnConsumer } from "./column-data";
import { ColumnContainer } from "./single-column";

class EmptyColumnPanel extends Component {
  render() {
    return h(NonIdealState, {
      title: "No columns selected",
      icon: "square",
      className: "selected-columns-empty",
      description: "Select some columns on the map to get started"
    });
  }
}

class SelectionPanel extends Component {
  constructor(props) {
    super(props);
    this.renderColumn = this.renderColumn.bind(this);
  }

  renderColumn(col) {
    let __;
    const { helpers, columnUnitIndex } = this.props;
    const id = helpers.getID(col);
    const units = columnUnitIndex[id] || null;
    if (units != null) {
      __ = [h("h4", col.properties.col_name), h(ColumnContainer, { units })];
    }
    if (__ == null) {
      __ = h("p", `Loading data for column ${id}`);
    }
    return h("div.column-data", { key: id }, __);
  }

  render() {
    const { selection } = this.props;
    const sel = [...selection]; // Sets cannot be mapped over
    if (sel.length === 0) {
      return h(EmptyColumnPanel);
    }

    return h("div.selected-columns", null, sel.map(this.renderColumn));
  }
}

const __ = props =>
  h(MacrostratColumnConsumer, null, ({ selection, helpers, columnUnitIndex }) =>
    h(SelectionPanel, { selection, helpers, columnUnitIndex, ...props })
  );

export { __ as SelectionPanel };

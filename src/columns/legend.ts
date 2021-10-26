/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { Component } from "react";
import h from "react-hyperscript";
import classNames from "classnames";
import { MacrostratColumnConsumer } from "./column-data";

class HoveredColumnLegend extends Component {
  render() {
    const { hoveredColumn } = this.props;
    const empty = hoveredColumn == null;
    const className = classNames({ empty }, "hovered-column-legend");
    let text = "Hover over a column to display details";
    if (!empty) {
      text = hoveredColumn.properties.col_name;
    }
    return h("h4", { className }, text);
  }
}

// Wrap in context
const HC = (props) =>
  h(MacrostratColumnConsumer, null, ({ hoveredColumn }) =>
    h(HoveredColumnLegend, { hoveredColumn, ...props })
  );

export { HC as HoveredColumnLegend };

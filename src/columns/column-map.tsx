/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { Component } from "react";
import { findDOMNode } from "react-dom";
import h from "@macrostrat/hyper";
import { ResizeSensor, Button } from "@blueprintjs/core";
import { geoOrthographic, geoGraticule10, geoPath } from "d3-geo";
import "d3-jetpack";
import { select, event } from "d3-selection";
import { drag } from "d3-drag";
import { zoom } from "d3-zoom";
import { get } from "axios";
import { feature } from "topojson-client";
import classNames from "classnames";
import { MacrostratColumnConsumer } from "./column-data";
import { SVG } from "@macrostrat/column-components";

class ColumnPath__ extends Component {
  render() {
    const { actions, hoveredColumn, helpers, column } = this.props;
    const hovered = helpers.isSame(column, hoveredColumn);
    const selected = helpers.isSelected(column);
    const className = classNames("column", { hovered, selected });
    return h("path", {
      className,
      onMouseEnter() {
        return actions.setHovered(column);
      },
      onMouseLeave() {
        return actions.setHovered();
      },
    });
  }
  componentDidMount() {
    const { column, actions } = this.props;
    return select(findDOMNode(this))
      .datum(column)
      .on("click", function () {
        // This handler can't be in React because
        // stopPropagation can't be called before zoom handlers
        actions.toggleSelected(column);
        // Right now stopPropagation is not called properly
        return event.stopPropagation();
      });
  }
}

const ColumnPath = (props) => {
  return h(
    MacrostratColumnConsumer,
    null,
    ({ actions, hoveredColumn, helpers }) =>
      h(ColumnPath__, { ...props, actions, hoveredColumn, helpers })
  );
};

class ColumnIndexMap__ extends Component {
  static initClass() {
    this.defaultProps = {
      columns: [],
    };
  }
  constructor(props) {
    super(props);
    this.setWidth = this.setWidth.bind(this);
    this.redrawPaths = this.redrawPaths.bind(this);
    const width = window.innerWidth;
    this.state = this.computeDerivedState({ width });
  }

  computeDerivedState(newState) {
    // Right now we derive the height of the component
    // from its width
    const { width } = newState;
    if (width != null) {
      let height = width / 6;
      if (height < 200) {
        height = 200;
      }
      const hypot = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
      const minScale = hypot / 1.9;
      newState = { height, minScale, ...newState };
    }
    return newState;
  }

  setState(newState) {
    const state = this.computeDerivedState(newState);
    return super.setState(state);
  }

  render() {
    const { columns, actions, selection } = this.props;
    const { width, height } = this.state;

    let clearSelectionButton = null;
    if (selection.length > 0) {
      clearSelectionButton = h(
        Button,
        {
          className: "clear-selection",
          icon: "graph-remove",
          onClick() {
            return actions.clearSelection();
          },
        },
        "Clear selection"
      );
    }

    return h("div#column-index-container", [
      clearSelectionButton,
      h(
        SVG,
        {
          id: "column-index-map",
          width,
          height,
        },
        [
          h("g.map-backdrop"),
          h(
            "g.columns",
            columns.map((column) => h(ColumnPath, { column }))
          ),
        ]
      ),
    ]);
  }

  setWidth() {
    return this.setState({ width: window.innerWidth });
  }

  updateProjection(prevProps, prevState) {
    if (prevState != null) {
      const { width: prevWidth } = prevState;
      if (this.state.width === prevWidth) {
        return;
      }
    }
    const { width, height, minScale } = this.state;
    this.projection
      .translate([width / 2, height / 2])
      .scale(minScale)
      .clipExtent([
        [0, 0],
        [width, height],
      ]);
    return this.redrawPaths();
  }

  redrawPaths(sel) {
    if (this.map == null) {
      return;
    }
    if (sel == null) {
      sel = this.map.selectAll("path");
    }
    return sel.attr("d", this.path);
  }

  componentDidUpdate(prevProps, prevState) {
    this.updateProjection(prevProps, prevState);
    if (prevProps.columns !== this.props.columns) {
      return this.redrawPaths(this.map.selectAll("path.column"));
    }
  }

  async componentDidMount() {
    window.addEventListener("resize", this.setWidth);
    const { width, height, minScale } = this.state;
    const center = [-75, 33];

    this.projection = geoOrthographic()
      .rotate([-center[0], -center[1]])
      .precision(0.2)
      .clipAngle(90);
    this.updateProjection();

    // https://unpkg.com/world-atlas@1/world/110m.json
    const el = findDOMNode(this);
    this.map = select(el).select("svg#column-index-map");

    const bkg = this.map.select("g.map-backdrop");

    // `await` does promises serially for now
    let { data } = await get("https://unpkg.com/world-atlas@1/world/50m.json");
    const land50 = feature(data, data.objects.land);

    ({ data } = await get("https://unpkg.com/world-atlas@1/world/110m.json"));
    const land110 = feature(data, data.objects.land);

    this.path = geoPath().projection(this.projection);

    const graticule = geoGraticule10();

    const grat = bkg
      .selectAppend("path.graticule")
      .datum(graticule)
      .call(this.redrawPaths);

    const land = bkg
      .selectAppend("path.land")
      .datum(land50)
      .call(this.redrawPaths);

    const updateData = (val) => () => {
      return land.datum(val).call(this.redrawPaths);
    };

    const sens = 0.08;
    const dragging = drag()
      .subject((d) => {
        const r = this.projection.rotate();
        return {
          x: r[0] / sens,
          y: -r[1] / sens,
        };
      })
      .on("drag", () => {
        const rotate = this.projection.rotate();
        this.projection.rotate([event.x * sens, -event.y * sens, rotate[2]]);
        return this.redrawPaths();
      })
      .on("start", updateData(land110))
      .on("end", updateData(land50));

    const zoomed = () => {
      const { deltaY } = event.sourceEvent;
      const currScale = this.projection.scale();
      const newScale = currScale - 2 * deltaY;
      if (newScale < minScale) {
        return;
      }
      if (newScale > minScale * 10) {
        return;
      }
      if (newScale === currScale) {
        return;
      }
      this.projection.scale(newScale);
      return this.redrawPaths();
    };

    const zoomBehavior = zoom()
      .on("zoom", zoomed)
      .on("start", updateData(land110))
      .on("end", updateData(land50));

    this.map.call(dragging);
    return this.map.call(zoomBehavior);
  }
}
ColumnIndexMap__.initClass();

const ColumnIndexMap = () => {
  return h(MacrostratColumnConsumer, null, ({ columns, actions, selection }) =>
    h(ColumnIndexMap__, { columns, actions, selection })
  );
};

export default ColumnIndexMap;

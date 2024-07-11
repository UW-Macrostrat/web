/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { Component } from "react";
import h from "react-hyperscript";
import T from "prop-types";
import { SwatchesPicker } from "react-color";
import { Popover } from "@blueprintjs/core";
import { FaciesContext } from "@macrostrat/column-components";

class FaciesColorPicker extends Component {
  static initClass() {
    this.contextType = FaciesContext;
    this.propTypes = {
      facies: T.object.isRequired
    };
  }
  render() {
    const { setFaciesColor } = this.context;
    const { facies: d } = this.props;
    return h("div", [
      h(SwatchesPicker, {
        color: d.color || "black",
        onChangeComplete(color) {
          return setFaciesColor(d.id, color.hex);
        },
        styles: {
          width: 500,
          height: 570
        }
      })
    ]);
  }
}
FaciesColorPicker.initClass();

const BasicFaciesSwatch = ({ facies: d, ...rest }) =>
  h("div.color-swatch", {
    style: {
      backgroundColor: d.color || "black",
      width: "2em",
      height: "2em"
    },
    ...rest
  });

class FaciesSwatch extends Component {
  constructor(...args) {
    super(...args);
    this.renderBasicSwatch = this.renderBasicSwatch.bind(this);
    this.render = this.render.bind(this);
  }

  static initClass() {
    this.defaultProps = {
      isEditable: true,
      facies: null
    };
  }
  renderBasicSwatch() {
    const { facies } = this.props;
    return h(BasicFaciesSwatch, { facies });
  }
  render() {
    const { facies, isEditable } = this.props;
    if (!this.props.isEditable) {
      return this.renderBasicSwatch;
    }
    return h(
      Popover,
      {
        tetherOptions: {
          constraints: [{ attachment: "together", to: "scrollParent" }]
        }
      },
      [this.renderBasicSwatch(), h(FaciesColorPicker, { facies })]
    );
  }
}
FaciesSwatch.initClass();

export { FaciesSwatch, BasicFaciesSwatch };

import React, { Component } from "react";
import { hexToRgb } from "../utils";

class AttrChip extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    let styles = {};
    if (this.props.fill) {
      styles[
        "backgroundImage"
      ] = `url('dist/img/geologic-patterns/${this.props.fill}.png')`;
    }
    return (
      <div className="lith-chip" style={styles}>
        <div
          className="lith-chip-inner"
          style={{ backgroundColor: hexToRgb(this.props.color, 0.6) }}
        >
          {this.props.name}
        </div>
      </div>
    );
  }
}

export default AttrChip;

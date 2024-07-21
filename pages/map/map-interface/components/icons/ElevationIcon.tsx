import React, { Component } from "react";

class ElevationIcon extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    let style = {
      fill: "#aaaaaa",
      stroke: "#aaaaaa",
      strokeWidth: "50px",
    };
    // let scale = `scale(${this.props.size / 500})`
    let scale = "scale(1)";
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 489.5 449.5"
        height={this.props.size || 50}
        width={this.props.size || 50}
        className="custom-svg-icon"
      >
        <g transform={scale}>
          <polygon
            style={style}
            points="16.51 268 110.51 150 190.51 282 311.51 82 410.51 282 488.5 184.59 488.5 432 16.51 432 16.51 268"
          />
          <line style={style} x1="489.5" y1="447" x2="2.5" y2="447" />
          <line style={style} x1="2.5" x2="2.5" y2="447" />
        </g>
      </svg>
    );
  }
}

export default ElevationIcon;

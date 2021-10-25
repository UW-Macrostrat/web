import React, { Component } from "react";

class ColumnIcon extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    let style = {
      fill: "#aaaaaa",
      stroke: "#f9f9fa",
      strokeWidth: "25px",
    };
    // let scale = `scale(${this.props.size / 500})`
    let scale = "scale(1)";
    return (
      <svg
        data-name="Layer 1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 503 503"
        height={this.props.size || 50}
        width={this.props.size || 50}
        className="custom-svg-icon"
      >
        <g transform={scale}>
          <rect x="1.5" y="1.5" width="500" height="500" style={style} />
          <line x1="251.5" y1="251.5" x2="387.42" y2="1.5" style={style} />
          <line x1="251.5" y1="251.5" x2="402.69" y2="501.5" style={style} />
          <line x1="251.5" y1="251.5" x2="1.5" y2="95.14" style={style} />
          <line x1="251.5" y1="251.5" x2="1.5" y2="501.5" style={style} />
        </g>
      </svg>
    );
  }
}

export default ColumnIcon;

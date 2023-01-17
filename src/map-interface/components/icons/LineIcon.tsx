import React from "react";
import { useDarkMode } from "@macrostrat/ui-components";

function LineIcon(props) {
  const darkMode = useDarkMode();
  const color = darkMode.isEnabled ? "#cccccc" : "#666666";
  const { size = 50, ...rest } = props;
  let style = {
    fill: color,
    stroke: color,
    strokeWidth: "4px",
    ...props,
  };
  // let scale = `scale(${this.props.size / 500})`
  let scale = "scale(1)";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 129 107"
      height={size}
      width={size}
      className="custom-svg-icon"
    >
      <g transform={scale}>
        <polyline points="7.74 6.47 64.78 52.73 123.34 100.22" style={style} />
        <polyline
          points="35.62 30.02 43.58 36.47 34.29 39.79 35.62 30.02"
          style={style}
        />
        <polyline
          points="88.05 71.86 96 78.31 86.72 81.64 88.05 71.86"
          style={style}
        />
        <polyline
          points="61.43 50.76 69.39 57.21 60.1 60.53 61.43 50.76"
          style={style}
        />
        <polyline
          points="113.02 92.11 120.97 98.56 111.69 101.89 113.02 92.11"
          style={style}
        />
        <polyline
          points="9.07 7.62 17.02 14.06 7.74 17.39 9.07 7.62"
          style={style}
        />
      </g>
    </svg>
  );
}

export default LineIcon;

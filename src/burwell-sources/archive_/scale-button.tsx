import React from "react";

interface ScaleButton {
  onClick: () => void;
  selectedScale: string;
  scale: string;
}

const ScaleButton = ({ onClick, selectedScale, scale }: ScaleButton) => (
  <div
    className="filter-button"
    onClick={onClick}
    style={{
      backgroundColor: scale === selectedScale ? "#ffffff" : "#dddddd",
    }}
  >
    {scale}
  </div>
);
export default ScaleButton;

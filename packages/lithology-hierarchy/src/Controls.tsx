import {
  LinkHorizontal,
  LinkHorizontalCurve,
  LinkHorizontalLine,
  LinkHorizontalStep,
  LinkRadial,
  LinkRadialCurve,
  LinkRadialLine,
  LinkRadialStep,
  LinkVertical,
  LinkVerticalCurve,
  LinkVerticalLine,
  LinkVerticalStep,
} from "@visx/shape";
import React, { ComponentType } from "react";

export function getLinkComponent({
  layout,
  linkType,
  orientation,
}: {
  layout: string;
  linkType: string;
  orientation: string;
}): ComponentType<any> {
  let LinkComponent: ComponentType<any>;

  if (layout === "polar") {
    if (linkType === "step") {
      LinkComponent = LinkRadialStep;
    } else if (linkType === "curve") {
      LinkComponent = LinkRadialCurve;
    } else if (linkType === "line") {
      LinkComponent = LinkRadialLine;
    } else {
      LinkComponent = LinkRadial;
    }
  } else if (orientation === "vertical") {
    if (linkType === "step") {
      LinkComponent = LinkVerticalStep;
    } else if (linkType === "curve") {
      LinkComponent = LinkVerticalCurve;
    } else if (linkType === "line") {
      LinkComponent = LinkVerticalLine;
    } else {
      LinkComponent = LinkVertical;
    }
  } else if (linkType === "step") {
    LinkComponent = LinkHorizontalStep;
  } else if (linkType === "curve") {
    LinkComponent = LinkHorizontalCurve;
  } else if (linkType === "line") {
    LinkComponent = LinkHorizontalLine;
  } else {
    LinkComponent = LinkHorizontal;
  }
  return LinkComponent;
}

const controlStyles = { fontSize: 10 };

type Props = {
  layout: string;
  orientation: string;
  linkType: string;
  stepPercent: number;
  setLayout: (layout: string) => void;
  setOrientation: (orientation: string) => void;
  setLinkType: (linkType: string) => void;
  setStepPercent: (percent: number) => void;
};

export function LinkControls({
  layout,
  orientation,
  linkType,
  stepPercent,
  setLayout,
  setOrientation,
  setLinkType,
  setStepPercent,
}: Props) {
  return (
    <div style={controlStyles}>
      <label>layout:</label>&nbsp;
      <select
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setLayout(e.target.value)}
        value={layout}
      >
        <option value="cartesian">cartesian</option>
        <option value="polar">polar</option>
      </select>
      &nbsp;&nbsp;
      <label>orientation:</label>&nbsp;
      <select
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setOrientation(e.target.value)}
        value={orientation}
        disabled={layout === "polar"}
      >
        <option value="vertical">vertical</option>
        <option value="horizontal">horizontal</option>
      </select>
      &nbsp;&nbsp;
      <label>link:</label>&nbsp;
      <select
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setLinkType(e.target.value)}
        value={linkType}
      >
        <option value="diagonal">diagonal</option>
        <option value="step">step</option>
        <option value="curve">curve</option>
        <option value="line">line</option>
      </select>
      {linkType === "step" && layout !== "polar" && (
        <>
          &nbsp;&nbsp;
          <label>step:</label>&nbsp;
          <input
            onClick={(e) => e.stopPropagation()}
            type="range"
            min={0}
            max={1}
            step={0.1}
            onChange={(e) => setStepPercent(Number(e.target.value))}
            value={stepPercent}
            disabled={linkType !== "step" || layout === "polar"}
          />
        </>
      )}
    </div>
  );
}

import React, { useState } from "react";
import {
  Card,
  Slider,
  FormGroup,
  Callout,
  Icon,
  Button,
} from "@blueprintjs/core";
import { SyncAppActions, AsyncAppActions, MAP_MODES } from "../../context";
import { Popover2 } from "@blueprintjs/popover2";

// import { ReactComponent as FourSide } from "jsx:../../assets/4-side.svg";
// import { ReactComponent as EightSide } from "jsx:../../assets/8-side.svg";
// import { ReactComponent as TwelveSide } from "jsx:../../assets/12-side.svg";
// import { ReactComponent as SixteenSide } from "jsx:../../assets/16-side.svg";
// import { ReactComponent as TwentySide } from "jsx:../../assets/20-side.svg";
// import { ReactComponent as TwentyFourSide } from "jsx:../../assets/24-side.svg";

function HelpText() {
  return (
    <Callout intent="none">
      <p>Options only for points picked outside of already existing polygon.</p>
      <p>*distance measurements are not fully accurate.</p>
    </Callout>
  );
}

const shapeLabelRenderer = (val: number) => {
  if (val == 1) {
    return <Icon icon="symbol-diamond" />;
  } else if (val == 6) {
    return <Icon icon="symbol-circle" />;
  }
  return null;
};

interface VoronoiToolBarProps {
  runAction(action: SyncAppActions | AsyncAppActions): Promise<void>;
  quad_segs: number;
  radius: number;
  mode: MAP_MODES;
}

function VoronoiToolBar(props: VoronoiToolBarProps) {
  if (props.mode != MAP_MODES.voronoi) return null;

  const onChangeShape = (value: number) => {
    /// runAction for shape setting
    props.runAction({ type: "set-quad-seg", quad_seg: value });
  };

  const onChangeRadius = (value: number) => {
    // change shape radius
    props.runAction({ type: "set-radius", radius: value });
  };

  const style = {
    position: "absolute",
    top: "65px",
    right: "50px",
    background: "white",
    zIndex: 1,
  };
  return (
    <Card style={style}>
      <Slider
        min={0}
        max={500}
        stepSize={10}
        showTrackFill={false}
        value={props.radius}
        onChange={onChangeRadius}
        labelRenderer={(value) => `${value}km`}
        labelValues={[1, 100, 200, 300, 400, 500]}
      />
      <Slider
        min={1}
        value={props.quad_segs}
        max={6}
        onChange={onChangeShape}
        stepSize={1}
        labelStepSize={1}
        labelRenderer={shapeLabelRenderer}
        showTrackFill={false}
      />
      <HelpText />
    </Card>
  );
}

export { VoronoiToolBar };

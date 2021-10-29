import React, { useState } from "react";

let Divider = (props) => <div className="whitespace-divider" />;

function InfoDrawer(props) {
  const [state, setState] = useState({
    expanded: null,
    bedrockExpanded: props.mapHasBedrock,
    bedrockMatchExpanded: props.mapHasBedrock,
    stratigraphyExpanded: props.mapHasColumns,
    pbdbExpanded: props.mapHasFossils,
    gddExpanded: false,
  });

  const handleChange = (panel) => {
    let prevState = { ...state };
    setState({
      ...prevState,
      expanded: state.expanded ? panel : false,
    });
  };

  const openGdd = () => {
    props.getGdd();
  };
}

import h from "@macrostrat/hyper";
import { FormGroup, NumericInput, Switch } from "@blueprintjs/core";
import { useDispatch, useSelector } from "react-redux";
import { DisplayQuality } from "./actions";

const GlobeSettings = (props) => {
  const dispatch = useDispatch();
  const state = useSelector((s) => s.globe);

  return h("div.globe-settings", [
    h(
      FormGroup,
      { label: "Vertical exaggeration" },
      h(NumericInput, {
        value: state.verticalExaggeration,
        onValueChange(value) {
          dispatch({ type: "set-exaggeration", value });
        },
      })
    ),
    h(
      FormGroup,
      { label: "High quality" },
      h(Switch, {
        value: state.displayQuality,
        onChange(isOn) {
          const value = isOn ? DisplayQuality.HIGH : DisplayQuality.LOW;
          dispatch({ type: "set-display-quality", value });
        },
      })
    ),
    h(
      FormGroup,
      { label: "Show inspector" },
      h(Switch, {
        value: state.showInspector,
        onChange(value) {
          dispatch({ type: "set-show-inspector", value });
        },
      })
    ),
  ]);
};

export { GlobeSettings };

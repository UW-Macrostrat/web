import {
  Button,
  Icon,
  Menu,
  MenuDivider,
  MenuItem,
  Popover,
  Switch,
} from "@blueprintjs/core";
import h from "@macrostrat/hyper";
import { useBurwellActions, useBurwellState } from "#/map/sources/app-state";

const capitalizeWord = (word) => {
  return word.charAt(0).toUpperCase() + word.slice(1);
};

function OptionsMenu() {
  const { selectedScale, flyTo } = useBurwellState((state) => state);
  const runAction = useBurwellActions();

  const onChange = () => {
    runAction({ type: "toggle-fly-option", flyTo: !flyTo });
  };

  const sizes = ["all", "large", "medium", "small", "tiny"];

  return h(Menu, [
    h(Switch, {
      style: { margin: "3px" },
      checked: flyTo,
      alignIndicator: "right",
      innerLabel: "off",
      innerLabelChecked: "on",
      label: "Fly To Source",
      onChange,
    }),
    h(MenuDivider, { title: "Scale" }),
    sizes.map((size, i) => {
      const onClick = (e) => {
        runAction({ type: "select-scale", selectedScale: size });
      };
      const iconName = size === selectedScale ? "tick" : null;
      const intent = size === selectedScale ? "primary" : "none";
      return h(MenuItem, {
        onClick,
        intent,
        key: i,
        text: capitalizeWord(size),
        labelElement: h(Icon, { icon: iconName }),
      });
    }),
  ]);
}

function Options() {
  return h(
    Popover,
    { content: h(OptionsMenu), minimal: true, position: "bottom-right" },
    [
      h(Button, { minimal: true }, [
        h("h5", { style: { margin: "0" } }, ["Options"]),
      ]),
    ]
  );
}

export default Options;

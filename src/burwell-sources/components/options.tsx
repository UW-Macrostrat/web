import { Menu, MenuItem, Popover, Button, Icon } from "@blueprintjs/core";
import {
  useBurwellActions,
  useBurwellState,
} from "~/burwell-sources/app-state";
import h from "@macrostrat/hyper";

const capitalizeWord = (word) => {
  return word.charAt(0).toUpperCase() + word.slice(1);
};

function ScaleMenu() {
  const { selectedScale } = useBurwellState((state) => state);
  const runAction = useBurwellActions();

  const sizes = ["all", "large", "medium", "small", "tiny"];
  return h(Menu, [
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
  return h(Popover, { content: h(ScaleMenu), minimal: true }, [
    h(Button, { minimal: true }, [
      h("h5", { style: { margin: "0" } }, ["Scale"]),
    ]),
  ]);
}

export default Options;

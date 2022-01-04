import { Menu, MenuItem, Popover, Button, Icon } from "@blueprintjs/core";
import {
  useBurwellActions,
  useBurwellState,
} from "~/burwell-sources/app-state";
import h from "@macrostrat/hyper";

const capitalizeWord = (word) => {
  return word.charAt(0).toUpperCase() + word.slice(1);
};

function ViewMenu() {
  const { view } = useBurwellState((state) => state);
  const runAction = useBurwellActions();

  const views = ["map", "list"];
  return h(MenuItem, { text: "View" }, [
    views.map((v, i) => {
      const onClick = (e) => {
        runAction({ type: "change-view", view: v });
      };

      const iconName = v === view ? "tick" : null;
      const intent = v === view ? "primary" : "none";
      return h(MenuItem, {
        onClick,
        intent,
        key: i,
        text: capitalizeWord(v),
        labelElement: h(Icon, { icon: iconName }),
      });
    }),
  ]);
}

function ScaleMenu() {
  const { selectedScale } = useBurwellState((state) => state);
  const runAction = useBurwellActions();

  const sizes = ["all", "large", "medium", "small", "tiny"];
  return h(MenuItem, { text: "Scale" }, [
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

function OptionMenu() {
  return h(Menu, [h(ViewMenu), h(ScaleMenu)]);
}

function Options() {
  return h(Popover, { content: h(OptionMenu), minimal: true }, [
    h(Button, { minimal: true }, [
      h("h3", { style: { margin: "0" } }, ["Options"]),
    ]),
  ]);
}

export default Options;

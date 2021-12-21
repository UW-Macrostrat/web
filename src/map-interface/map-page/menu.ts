import hyper from "@macrostrat/hyper";
import ColumnIcon from "../components/icons/ColumnIcon";
import LineIcon from "../components/icons/LineIcon";
import ElevationIcon from "../components/icons/ElevationIcon";
import FossilIcon from "../components/icons/FossilIcon";
import BedrockIcon from "../components/icons/BedrockIcon";
import {
  Button,
  ButtonGroup,
  Alignment,
  ButtonProps,
  IconName,
  PanelStack2,
  Panel,
} from "@blueprintjs/core";
import { CloseableCard } from "../components/closeable-card";
import { useSelector, useDispatch } from "react-redux";
import { MenuPanel } from "../reducers/menu";
import AboutText from "../components/About";
import { SettingsPanel } from "./settings-panel";
import { useAppActions, useMenuState } from "../reducers";
import styles from "./main.module.styl";

const h = hyper.styled(styles);

type ListButtonProps = ButtonProps & {
  icon: React.ComponentType | IconName;
};
const ListButton = (props: ListButtonProps) => {
  let { icon, ...rest } = props;
  if (typeof props.icon != "string") {
    icon = h(props.icon, { size: 20 });
  }
  return h(Button, { ...props, icon });
};

const MinimalButton = (props) => h(Button, { ...props, minimal: true });

const TabButton = (props: ButtonProps & { tab: MenuPanel }) => {
  const { tab, ...rest } = props;
  const dispatch = useDispatch();
  const onClick = () => dispatch({ type: "set-panel", panel: tab });
  const active = useSelector((state) => state.menu.activePanel == tab);
  return h(MinimalButton, { active, onClick, ...rest });
};

const LayerButton = (props: ListButtonProps & { layer: string }) => {
  const { layer, ...rest } = props;
  const active = useSelector((state) => state.update["mapHas" + layer]);
  const runAction = useAppActions();
  const onClick = () => runAction({ type: "toggle-" + layer.toLowerCase() });
  return h(ListButton, {
    active,
    onClick,
    text: layer,
    ...rest,
  });
};

const MenuGroup = (props) =>
  h(ButtonGroup, {
    className: "menu-options",
    vertical: true,
    minimal: true,
    alignText: Alignment.LEFT,
    large: true,
    ...props,
  });

const LayerList = (props) => {
  const runAction = useAppActions();

  const toggleElevationChart = () => {
    runAction({ type: "toggle-menu" });
    runAction({ type: "toggle-elevation-chart" });
  };

  return h("div.menu-content", [
    h(MenuGroup, [
      h(LayerButton, {
        layer: "Bedrock",
        icon: BedrockIcon,
      }),
      h(LayerButton, {
        layer: "Lines",
        icon: LineIcon,
      }),
      h(LayerButton, {
        layer: "Columns",
        icon: ColumnIcon,
      }),
      h(LayerButton, {
        layer: "Fossils",
        icon: FossilIcon,
      }),
      h(LayerButton, {
        layer: "Satellite",
        icon: "satellite",
      }),
    ]),
    h(MenuGroup, [
      h(ListButton, { disabled: true, icon: "map-marker" }, "Your location"),
      h(
        ListButton,
        { onClick: toggleElevationChart, icon: ElevationIcon },
        "Elevation profile"
      ),
    ]),
  ]);
};

function useMainPanel(): Panel<{}> {
  const activePanel = useSelector((state) => state.menu.activePanel);
  switch (activePanel) {
    case MenuPanel.LAYERS:
      return {
        title: "Layers",
        renderPanel: () => h(LayerList),
      };
    case MenuPanel.SETTINGS:
      return {
        title: "Settings",
        renderPanel: () => h(SettingsPanel),
      };
    case MenuPanel.ABOUT:
      return {
        title: "About",
        renderPanel: () => h(AboutText),
      };
  }
  return null;
}

const Menu = (props) => {
  const runAction = useAppActions();
  const { menuOpen, panelStack = [] } = useMenuState();

  const toggleMenu = () => {
    runAction({ type: "toggle-menu" });
  };

  let exitTransition = { exit: 300 };

  const stack = [useMainPanel(), ...panelStack];

  return h(
    CloseableCard,
    {
      isOpen: menuOpen,
      onClose: toggleMenu,
      title: "Layers",
      transitionDuration: exitTransition,
    },
    [
      h(CloseableCard.Header, [
        h.if(stack.length == 1)("div.buttons", [
          h(TabButton, {
            icon: "layers",
            text: "Layers",
            tab: MenuPanel.LAYERS,
          }),
          // Settings are mostly for globe, which is currently disabled
          //h(TabButton, {icon: "settings", text: "Settings", tab: MenuPanel.SETTINGS}),
          h(TabButton, {
            icon: "info-sign",
            text: "About",
            tab: MenuPanel.ABOUT,
          }),
        ]),
        h.if(stack.length > 1)([
          h(
            Button,
            {
              icon: "chevron-left",
              minimal: true,
              onClick: () => runAction({ type: "close-panel" }),
            },
            stack[stack.length - 2]?.title ?? "Back"
          ),
          h("h2.panel-title", stack[stack.length - 1]?.title),
        ]),
      ]),
      h(PanelStack2, {
        showPanelHeader: false,
        renderActivePanelOnly: true,
        stack,
      }),
    ]
  );
};

export default Menu;

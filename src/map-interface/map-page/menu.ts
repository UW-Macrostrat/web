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
  Switch,
} from "@blueprintjs/core";
import { CloseableCard } from "../components/closeable-card";
import { useSelector, useDispatch } from "react-redux";
import AboutText from "../components/About";
import { SettingsPanel } from "./settings-panel";
import {
  useAppActions,
  useMenuState,
  useAppState,
  MenuPanel,
  MapLayer,
} from "../app-state";
import styles from "./main.module.styl";

const h = hyper.styled(styles);

type ListButtonProps = ButtonProps & {
  icon: React.ComponentType | IconName | React.ReactNode;
};

const ListButton = (props: ListButtonProps) => {
  let { icon, ...rest } = props;
  if (typeof props.icon != "string") {
    icon = h(props.icon, { size: 20 });
  }
  return h(Button, { ...props, className: "list-button", icon });
};

const MinimalButton = (props) => h(Button, { ...props, minimal: true });

const TabButton = (props: ButtonProps & { tab: MenuPanel }) => {
  const { tab, ...rest } = props;
  const dispatch = useDispatch();
  const onClick = () => dispatch({ type: "set-panel", panel: tab });
  const active = useAppState((state) => state.menu.activePanel == tab);
  return h(MinimalButton, { active, onClick, ...rest });
};

type LayerButtonProps = ListButtonProps & { layer: MapLayer; name: string };

function LayerButton(props: LayerButtonProps) {
  const { layer, name, ...rest } = props;
  const active = useAppState((state) => state.core.mapLayers.has(layer));
  const runAction = useAppActions();
  const onClick = () => runAction({ type: "toggle-map-layer", layer });
  return h(ListButton, {
    active,
    onClick,
    text: name,
    ...rest,
  });
}

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
        name: "Bedrock",
        layer: MapLayer.BEDROCK,
        icon: BedrockIcon,
      }),
      h(LayerButton, {
        name: "Lines",
        layer: MapLayer.LINES,
        icon: LineIcon,
      }),
      h(LayerButton, {
        name: "Columns",
        layer: MapLayer.COLUMNS,
        icon: ColumnIcon,
      }),
      h(LayerButton, {
        name: "Fossils",
        layer: MapLayer.FOSSILS,
        icon: FossilIcon,
      }),
      h(LayerButton, {
        name: "Satellite",
        layer: MapLayer.SATELLITE,
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
  const { menuOpen, infoDrawerOpen, panelStack = [] } = useMenuState();

  const toggleMenu = () => {
    runAction({ type: "toggle-menu" });
  };

  const stack = [useMainPanel(), ...panelStack];

  if (window.innerWidth <= 768 && infoDrawerOpen) {
    return h("div");
  }

  return h(
    CloseableCard,
    {
      isOpen: menuOpen,
      onClose: toggleMenu,
      insetContent: false,
      renderHeader: () =>
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
    },
    [
      h(PanelStack2, {
        showPanelHeader: false,
        renderActivePanelOnly: true,
        stack,
      }),
    ]
  );
};

export default Menu;

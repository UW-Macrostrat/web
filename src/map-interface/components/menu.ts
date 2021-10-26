import h from "@macrostrat/hyper";
import ColumnIcon from "./icons/ColumnIcon";
import LineIcon from "./icons/LineIcon";
import ElevationIcon from "./icons/ElevationIcon";
import FossilIcon from "./icons/FossilIcon";
import BedrockIcon from "./icons/BedrockIcon";
import {
  Button,
  ButtonGroup,
  Alignment,
  ButtonProps,
  IconName,
} from "@blueprintjs/core";
import { CloseableCard } from "./CloseableCard";
import { useSelector, useDispatch } from "react-redux";
import { MenuPanel } from "../reducers/menu";
import AboutText from "./About";
import { SettingsPanel } from "./settings-panel";
import { connect } from "react-redux";
import {
  toggleMenu,
  toggleBedrock,
  toggleLines,
  toggleSatellite,
  toggleColumns,
  toggleFossils,
  toggleAbout,
  toggleElevationChart,
} from "../actions";

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
  const dispatch = useDispatch();
  const onClick = () => dispatch({ type: "TOGGLE_" + layer.toUpperCase() });
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
  const dispatch = useDispatch();

  const toggleElevationChart = () => {
    dispatch({ type: "TOGGLE_MENU" });
    dispatch({ type: "TOGGLE_ELEVATION_CHART" });
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

const PanelContent = (props: { activePanel: MenuPanel }) => {
  const activePanel = useSelector((state) => state.menu.activePanel);
  switch (activePanel) {
    case MenuPanel.LAYERS:
      return h(LayerList);
    case MenuPanel.SETTINGS:
      return h(SettingsPanel);
    case MenuPanel.ABOUT:
      return h(AboutText);
  }
  return null;
};

const Menu = (props) => {
  const { menuOpen, toggleMenu } = props;

  let exitTransition = { exit: 300 };

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
        h("div.buttons", [
          h(TabButton, {
            icon: "layers",
            text: "Layers",
            tab: MenuPanel.LAYERS,
          }),
          h(TabButton, {
            icon: "settings",
            text: "Settings",
            tab: MenuPanel.SETTINGS,
          }),
          h(TabButton, {
            icon: "info-sign",
            text: "About",
            tab: MenuPanel.ABOUT,
          }),
        ]),
      ]),
      h(PanelContent),
    ]
  );
};

const mapStateToProps = (state) => {
  return {
    menuOpen: state.update.menuOpen,
    mapHasBedrock: state.update.mapHasBedrock,
    mapHasSatellite: state.update.mapHasSatellite,
    mapHasColumns: state.update.mapHasColumns,
    mapHasFossils: state.update.mapHasFossils,
    mapHasLines: state.update.mapHasLines,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    toggleMenu: () => {
      dispatch(toggleMenu());
    },
    toggleBedrock: () => {
      dispatch(toggleBedrock());
    },
    toggleLines: () => {
      dispatch(toggleLines());
    },
    toggleSatellite: () => {
      dispatch(toggleSatellite());
    },
    toggleColumns: () => {
      dispatch(toggleColumns());
    },
    toggleFossils: () => {
      dispatch(toggleFossils());
    },
    toggleAbout: () => {
      dispatch(toggleAbout());
    },
    toggleElevationChart: () => {
      dispatch(toggleElevationChart());
    },
  };
};

const MenuContainer = connect(mapStateToProps, mapDispatchToProps)(Menu);

export default MenuContainer;

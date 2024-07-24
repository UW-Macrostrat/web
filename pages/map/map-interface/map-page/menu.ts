import {
  Alignment,
  Button,
  ButtonGroup,
  ButtonProps,
  Card,
  NonIdealState,
} from "@blueprintjs/core";
import loadable from "@loadable/component";
import { mapPagePrefix } from "@macrostrat-web/settings";
import hyper from "@macrostrat/hyper";
import classNames from "classnames";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { useTransition } from "transition-hook";
import useBreadcrumbs from "use-react-router-breadcrumbs";
import {
  MapLayer,
  MenuPage,
  useAppActions,
  useAppState,
  useHashNavigate,
} from "../app-state";
import {
  isDetailPanelRouteInternal,
  useCurrentPage,
} from "../app-state/nav-hooks";
import Changelog from "../changelog.mdx";
import { LayerButton, LinkButton, ListButton } from "../components/buttons";
import { CloseableCard } from "../components/closeable-card";
import BedrockIcon from "../components/icons/BedrockIcon";
import ColumnIcon from "../components/icons/ColumnIcon";
import ElevationIcon from "../components/icons/ElevationIcon";
import FossilIcon from "../components/icons/FossilIcon";
import LineIcon from "../components/icons/LineIcon";
import { SearchResults } from "../components/navbar";
import UsageText from "../usage.mdx";
import styles from "./main.module.styl";
import { ExperimentsPanel, SettingsPanel } from "./settings-panel";

function ChangelogPanel() {
  return h("div.bp5-text.text-panel", [h(Changelog)]);
}

const AboutText = loadable(() => import("../components/About"));

const h = hyper.styled(styles);

const TabButton = (props: ButtonProps & { page: MenuPage }) => {
  const { page, ...rest } = props;
  const active = useAppState((s) => s.menu.activePage) == page;
  const runAction = useAppActions();

  return h(Button, {
    minimal: true,
    active,
    onClick() {
      runAction({ type: "set-menu-page", page });
    },
    ...rest,
    className: "tab-button",
  });
};

const MenuGroup = (props) =>
  h(ButtonGroup, {
    className: "menu-group",
    vertical: true,
    minimal: true,
    large: true,
    alignText: Alignment.LEFT,
    ...props,
  });

const LayerList = (props) => {
  const runAction = useAppActions();
  const inPaleoMode = useAppState((s) => s.core.timeCursorAge != null);

  const toggleElevationChart = () => {
    runAction({ type: "toggle-menu" });
    runAction({ type: "toggle-cross-section" });
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
      h(
        ListButton,
        {
          onClick: toggleElevationChart,
          icon: ElevationIcon,
          disabled: inPaleoMode,
        },
        "Elevation profile"
      ),
    ]),
  ]);
};

const UsagePanel = () => h("div.text-panel", h(UsageText));

const locationTitleForRoute = {
  "/about": "About",
  "/usage": "Usage",
  "/settings": "Settings",
  "/experiments": "Experiments",
  "/layers": "Layers",
  "/changelog": "Changelog",
};

const menuBacklinkLocationOverrides = {
  "/changelog": "/about",
};

function useLastPageLocation(
  baseRoute = "/"
): { title: string; to: string } | null {
  const breadcrumbs = useBreadcrumbs().filter((b) =>
    b.key.startsWith(baseRoute)
  );
  if (breadcrumbs.length < 2) return null;
  const prevPage = breadcrumbs[breadcrumbs.length - 2];
  const currentPage = breadcrumbs[breadcrumbs.length - 1];
  const prevRoute =
    menuBacklinkLocationOverrides[currentPage.match.pathname] ??
    prevPage.match.pathname;
  if (prevRoute == mapPagePrefix || isDetailPanelRouteInternal(prevRoute))
    return null;
  return {
    to: mapPagePrefix + prevRoute,
    title: locationTitleForRoute[prevRoute] ?? "Back",
  };
}

function MenuHeaderButtons({ baseRoute = "/" }) {
  const backLoc = useLastPageLocation(baseRoute);
  const { pathname } = useLocation();

  if (backLoc != null) {
    return h([
      h(
        LinkButton,
        {
          icon: "chevron-left",
          minimal: true,
          to: backLoc.to,
        },
        backLoc.title
      ),
      h("h2.panel-title", locationTitleForRoute[pathname] ?? ""),
    ]);
  }

  return h("div.buttons", [
    h(TabButton, {
      icon: "layers",
      text: "Layers",
      page: MenuPage.LAYERS,
    }),
    h(TabButton, {
      icon: "settings",
      text: "Settings",
      page: MenuPage.SETTINGS,
    }),
    h(TabButton, {
      icon: "info-sign",
      text: "About",
      page: MenuPage.ABOUT,
    }),
    h(TabButton, {
      icon: "help",
      text: "Usage",
      page: MenuPage.USAGE,
    }),
  ]);
}

function HeaderWrapper({ children, minimal = false }) {
  /* A small component that changes whether a "minimal" class is applied, but only if the item isn't hovered.
  This prevents buttons from moving around when the user is hovering over them. */
  const [isHovered, setIsHovered] = useState(false);
  const [isMinimal, setIsMinimal] = useState(minimal);
  const onMouseEnter = () => setIsHovered(true);
  const onMouseLeave = () => setIsHovered(false);
  useEffect(() => {
    if (isHovered) return;
    setIsMinimal(minimal);
  }, [minimal, isHovered]);

  const className = classNames("panel-header", { minimal: isMinimal });

  return h(
    CloseableCard.Header,
    { onMouseEnter, onMouseLeave, className },
    children
  );
}

type MenuProps = {
  className?: string;
  menuPage: MenuPage;
};

const Menu = (props: MenuProps) => {
  let { className, menuPage, baseRoute = "/" } = props;
  const inputFocus = useAppState((s) => s.core.inputFocus);
  const runAction = useAppActions();

  const navigateHome = useHashNavigate(baseRoute);

  const pageName = useCurrentPage(baseRoute);
  const isNarrow = menuPage == MenuPage.LAYERS || menuPage == MenuPage.SETTINGS;
  const isNarrowTrans = useTransition(isNarrow, 800);

  if (inputFocus) {
    return h(SearchResults, { className });
  }

  className = classNames(
    className,
    "menu-card",
    menuPage,
    { "narrow-card": isNarrowTrans.shouldMount },
    `narrow-${isNarrowTrans.stage}`
  );

  return h(
    CloseableCard,
    {
      onClose() {
        runAction({ type: "toggle-menu" });
      },
      insetContent: false,
      className,
      renderHeader: () =>
        h(
          HeaderWrapper,
          { minimal: isNarrow },
          h(MenuHeaderButtons, { baseRoute })
        ),
    },
    elementForMenuPage(menuPage)
  );
};

export const PanelCard = (props) =>
  h(Card, { ...props, className: classNames("panel-card", props.className) });

function elementForMenuPage(page: MenuPage) {
  switch (page) {
    case MenuPage.LAYERS:
      return h(LayerList);
    case MenuPage.SETTINGS:
      return h(SettingsPanel);
    case MenuPage.ABOUT:
      return h(AboutText);
    case MenuPage.USAGE:
      return h(UsagePanel);
    case MenuPage.CHANGELOG:
      return h(ChangelogPanel);
    case MenuPage.EXPERIMENTS:
      return h(ExperimentsPanel);
  }
}

function NotFoundPage() {
  const navigate = useHashNavigate("/");
  return h(
    "div.text-panel",
    h(NonIdealState, {
      title: "Unknown page",
      action: h(
        Button,
        {
          onClick: navigate,
          minimal: true,
          rightIcon: "chevron-right",
        },
        "Main page"
      ),
    })
  );
}

export { MenuPage };
export default Menu;

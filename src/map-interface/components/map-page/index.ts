import hyper from "@macrostrat/hyper";
import { HTMLDivProps } from "@blueprintjs/core";
import styles from "./main.module.styl";
import classNames from "classnames";
import { useTransition } from "transition-hook";
import { MapboxMapProvider, ZoomControl } from "@macrostrat/mapbox-react";
import { MapBottomControls, MapStyledContainer } from "../../map-page/map-view";

const h = hyper.styled(styles);

type AnyElement = React.ReactNode | React.ReactElement | React.ReactFragment;

export function MapAreaContainer({
  children,
  className,
  navbar,
  contextPanel = null,
  detailPanel = null,
  detailPanelOpen = true,
  contextPanelOpen = true,
  bottomPanel = null,
  mainPanel,
  mapControls = h(MapBottomControls),
  contextStackProps = null,
  detailStackProps = null,
  ...rest
}: {
  navbar: AnyElement;
  children?: AnyElement;
  mapControls?: AnyElement;
  contextPanel?: AnyElement;
  mainPanel?: AnyElement;
  detailPanel?: AnyElement;
  bottomPanel?: AnyElement;
  className?: string;
  detailPanelOpen?: boolean;
  contextPanelOpen?: boolean;
  contextStackProps?: HTMLDivProps;
  detailStackProps?: HTMLDivProps;
}) {
  const contextPanelTrans = useTransition(contextPanelOpen, 800);
  const detailPanelTrans = useTransition(detailPanelOpen, 800);

  /* We apply a custom style to the panel container when we are interacting
    with the search bar, so that we can block map interactions until search
    bar focus is lost.
    We also apply a custom style when the infodrawer is open so we can hide
    the search bar on mobile platforms
  */
  const _className = classNames(
    {
      searching: false,
      "detail-panel-open": detailPanelOpen,
    },
    `context-panel-${contextPanelTrans.stage}`,
    `detail-panel-${detailPanelTrans.stage}`
  );

  return h(MapboxMapProvider, [
    h(MapStyledContainer, { className: classNames("map-page", className) }, [
      h("div.main-ui", { className: _className, ...rest }, [
        h("div.context-stack", contextStackProps, [
          navbar,
          h.if(contextPanelTrans.shouldMount)([contextPanel]),
        ]),
        //h(MapView),
        children ?? mainPanel,
        h("div.detail-stack.infodrawer-container", detailStackProps, [
          detailPanel,
          h("div.spacer"),
          mapControls,
        ]),
      ]),
      h("div.bottom", null, bottomPanel),
    ]),
  ]);
}

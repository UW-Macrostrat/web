import { CSSTransition, SwitchTransition } from "react-transition-group";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.styl";
import classNames from "classnames";
import { Spinner } from "@blueprintjs/core";

const h = hyper.styled(styles);

function Conditional(props) {
  const { shown, component, children, className } = props;

  return h(
    CSSTransition,
    {
      in: shown,
      mountOnEnter: true,
      unmountOnExit: true,
      timeout: 1000,
      className: classNames(className, "transition-item"),
    },
    children ?? h(component)
  );
}

function LoadingArea(props) {
  const { loaded, children = null } = props;
  return h([
    h(
      Conditional,
      { shown: !loaded, className: "spinner" },
      h("div", [h(Spinner)])
    ),
    h(Conditional, { shown: loaded, className: "infodrawer-info" }, children),
  ]);
}

export { Conditional, LoadingArea };

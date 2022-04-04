import { CSSTransition } from "react-transition-group";
import hyper from "@macrostrat/hyper";
import styles from "./main.module.styl";
import classNames from "classnames";

const h = hyper.styled(styles);

function Conditional(props) {
  const { shown, component, children, className } = props;

  return h(
    CSSTransition,
    {
      in: shown,
      mountOnEnter: true,
      unmountOnExit: true,
      timeout: 10000,
      className: classNames(className, "transition-item"),
    },
    children ?? h(component)
  );
}

export { Conditional };

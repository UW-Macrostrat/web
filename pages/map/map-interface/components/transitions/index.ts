import hyper from "@macrostrat/hyper";
import styles from "./main.module.styl";
import classNames from "classnames";
import { Spinner } from "@blueprintjs/core";
import { useTransition } from "transition-hook";

const h = hyper.styled(styles);

export function LoadingArea(props) {
  const { loaded, children, className } = props;
  const trans = useTransition(loaded, 500);
  const invTrans = useTransition(!loaded, 500);

  return h(
    "div.loading-area",
    { className: classNames(className, trans.stage) },
    [
      h.if(trans.shouldMount)("div.spinner", null, h(Spinner)),
      h("div.data", null, children),
    ]
  );
}

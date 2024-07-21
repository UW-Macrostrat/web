import hyper from "@macrostrat/hyper";
import styles from "./main.module.styl";
import classNames from "classnames";
import { Spinner } from "@blueprintjs/core";
import { useTransition } from "transition-hook";

const h = hyper.styled(styles);

function LoadingArea(props) {
  const { loaded, children = null, className } = props;
  const trans = useTransition(loaded, 500);
  const invTrans = useTransition(!loaded, 500);

  return h(
    "div.loading-area",
    { className: classNames(className, trans.stage) },
    [
      h.if(invTrans.shouldMount)("div.spinner", null, h(Spinner)),
      h.if(trans.shouldMount)("div.data", null, children),
    ]
  );
}

export { LoadingArea };

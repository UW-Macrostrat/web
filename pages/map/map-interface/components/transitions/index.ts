import h from "./index.module.sass";
import classNames from "classnames";
import { Spinner } from "@blueprintjs/core";
import { useCallback, useEffect, useRef, useState } from "react";

export function LoadingArea(props) {
  const { loaded, children, className } = props;
  //const trans = useTransition(loaded, 500);

  const _className = classNames("loading-area", className); //, trans.stage);

  let spinner = null;
  if (!loaded) {
    spinner = h("div.spinner", null, h(Spinner));
  }

  return h("div", { className: _className }, [
    spinner,
    h("div.data", {}, children),
  ]);
}

interface TransitionStatus {
  stage: "off" | "transition off" | "transition on" | "on";
  isOff: boolean;
  isOn: boolean;
  isTransitioning: boolean;
}

function useTransition(flag: boolean, timeout: number): TransitionStatus {
  const [status, setStatus] = useState<TransitionStatus["stage"]>(
    flag ? "on" : "off"
  );

  const _setStatus = useCallback((newStatus: TransitionStatus["stage"]) => {
    setStatus(newStatus);
    console.log("setStatus", newStatus);
  }, []);

  // Reference to timer in case transitions need to be cancelled
  const timer = useRef(null);

  useEffect(() => {
    if (flag) {
      // Transitioning from off to on
      if (timer.current) {
        clearTimeout(timer.current); // Clear any existing timer
      }

      _setStatus("transition on");
      timer.current = setTimeout(() => _setStatus("on"), timeout);
    } else {
      if (timer.current) {
        clearTimeout(timer.current); // Clear any existing timer
      }

      // Transitioning from on to off
      _setStatus("transition off");
      timer.current = setTimeout(() => _setStatus("off"), timeout);
    }
  }, [flag]);

  return {
    stage: status,
    isOff: status === "off",
    isOn: status === "on",
    isTransitioning: status.includes("transition"),
  };
}

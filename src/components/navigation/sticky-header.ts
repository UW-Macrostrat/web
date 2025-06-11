import hyper from "@macrostrat/hyper";
import styles from "./sticky-header.module.sass";
import classNames from "classnames";
import { useEffect, useRef, useState } from "react";
import { useTransition } from "transition-hook";

const h = hyper.styled(styles);

export function StickyHeader(props) {
  const ref = useRef(null);
  const isStuckToTop = useIsStuckToTop(ref);
  const transition = useTransition(isStuckToTop, 500);
  const { children } = props;

  const className = classNames(
    {
      "is-stuck": isStuckToTop,
    },
    "transition-" + transition.stage,
    props.className
  );

  return h("header.sticky-header", { ...props, ref, className }, [
    h("div.backdrop"),
    children,
  ]);
}

function useIsStuckToTop(ref) {
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setIsStuck(rect.top <= 0);
      }
    };

    // Initial check
    handleScroll();

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [ref]);

  return isStuck;
}

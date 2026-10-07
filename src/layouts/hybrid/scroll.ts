/** Scroll-derived affordances for the content presentation. */

import { useEffect, useState } from "react";
import styles from "./composer.module.sass";

/** True once the page is scrolled far enough that the real footer is out of
 * sight, and false again as it comes back into range.
 *
 * Deliberately pure scroll math rather than an observer on the footer element:
 * the footer lives in the composer while the affordance lives in the frame, and
 * "am I within half a viewport of the bottom" is a good enough proxy for "can I
 * see the footer" without threading a ref between them. The shell scrolls its
 * region below the header rather than the document, so that is what's read.
 */
export function useShowFooterAffordance(): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = (evt: Event) => {
      const scroller = evt.target;
      if (!(scroller instanceof Element)) return;
      if (!scroller.classList.contains(styles["content-scroll"])) return;
      const y = scroller.scrollTop;
      const viewport = scroller.clientHeight;
      const total = scroller.scrollHeight;

      const scrolledAway = y > viewport * 0.6;
      const nearBottom = y + viewport > total - viewport * 0.5;
      setShow(scrolledAway && !nearBottom);
    };

    // Capture phase: scroll events don't bubble from an element to the window
    window.addEventListener("scroll", update, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", update, { capture: true } as any);
    };
  }, []);

  return show;
}

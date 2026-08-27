/** Scroll-derived affordances for the content presentation. */

import { useEffect, useState } from "react";

/** True once the document is scrolled far enough that the real footer is out
 * of sight, and false again as it comes back into range.
 *
 * Deliberately pure scroll math rather than an observer on the footer element:
 * the footer lives in the composer while the affordance lives in the frame, and
 * "am I within half a viewport of the bottom" is a good enough proxy for "can I
 * see the footer" without threading a ref between them.
 */
export function useShowFooterAffordance(): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => {
      const y = window.scrollY;
      const viewport = window.innerHeight;
      const total = document.documentElement.scrollHeight;

      const scrolledAway = y > viewport * 0.6;
      const nearBottom = y + viewport > total - viewport * 0.5;
      setShow(scrolledAway && !nearBottom);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return show;
}

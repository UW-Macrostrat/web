/** Chrome for the hybrid frame.
 *
 * The frame's header lives in `page.ts` (it differs per shell). What's here is
 * the site footer's routes in.
 *
 * The footer is the site's real `Footer`, unmodified, presented in a popover.
 * In the content shell you scroll to it — and, once it's out of sight, reach it
 * from a right-aligned overlay button in footer position. In the map shell,
 * where there is no footer to scroll to, the same button sits in the navbar's
 * controls. There is deliberately no persistent footer bar.
 */

import { Button, Popover } from "@blueprintjs/core";
import { useAtom } from "jotai";
import classNames from "classnames";

import { Footer } from "~/layouts/footer";

import h from "./chrome.module.sass";
import { useShowFooterAffordance } from "./scroll";
import { footerLinksOpenAtom } from "./state";

/** The site footer, verbatim, in a popover.
 *
 * `floating` styles the trigger as a pill for the content frame's overlay
 * placement and flips the popover to open upward; the toolbar placement opens
 * downward. Open state lives in an atom so a scroll-gated wrapper can keep the
 * trigger visible while its popover is up. */
export function FooterLinksButton({ floating = false }) {
  const [open, setOpen] = useAtom(footerLinksOpenAtom);

  let placement = "bottom-end";
  if (floating) {
    placement = "top-end";
  }

  let text = null;
  if (floating) {
    text = "Site links";
  }

  return h(Popover, {
    minimal: true,
    placement,
    isOpen: open,
    onInteraction: (next: boolean) => setOpen(next),
    content: h("div.footer-popover", h(Footer, { className: "popover-footer" })),
    // `renderTarget` rather than a child element, so Blueprint owns the target
    // ref directly instead of cloning a child to attach it.
    renderTarget: ({ isOpen, ...targetProps }) =>
      h(
        Button,
        {
          ...targetProps,
          className: classNames("footer-links-button", { floating }),
          minimal: !floating,
          small: true,
          active: isOpen,
          icon: "menu",
          title: "Site links",
        },
        text
      ),
  });
}

/** Footer-position affordance for the long-scrolling content frame, where the
 * real footer can be thousands of rows away. Right-aligned, and shown only once
 * you've scrolled far enough to have lost sight of a footer — hiding again as
 * the real one comes into range. */
export function FooterOverlayTrigger() {
  const scrolledAway = useShowFooterAffordance();
  const [open] = useAtom(footerLinksOpenAtom);
  const visible = scrolledAway || open;

  return h(
    "div.footer-overlay",
    { className: classNames({ visible }), "aria-hidden": !visible },
    h(FooterLinksButton, { floating: true })
  );
}

/** Chrome for the hybrid frame.
 *
 * There is exactly *one* full-width bar: the top toolbar, which carries the
 * app's own `PageBreadcrumbs` (logo included) on the left and the actions
 * panel on the right. Page-level titling lives in the content panel's own
 * header, not in a second full-width bar.
 *
 * The footer is the site's real `Footer`, unmodified, presented in a popover.
 * In the content frame you scroll to it — and, once it's out of sight, reach it
 * from a right-aligned overlay button in footer position. In the fullscreen
 * frame, where there is no footer to scroll to, the same button sits in the top
 * toolbar's actions. There is deliberately no persistent footer bar; pages that
 * want a bottom strip pass their own via `HybridPage`'s `bottomBar`.
 */

import { Button, Popover } from "@blueprintjs/core";
import { useAtom } from "jotai";
import classNames from "classnames";
import type { ReactNode } from "react";

import { PageBreadcrumbs } from "~/components";
import { Footer } from "~/layouts/footer";

import h from "./chrome.module.sass";
import { useShowFooterAffordance } from "./scroll";
import { footerLinksOpenAtom } from "./state";

export function TopToolbar({
  actions,
  floating = false,
}: {
  actions?: ReactNode;
  floating?: boolean;
}) {
  return h("div.top-toolbar", { className: classNames({ floating }) }, [
    h(
      "div.toolbar-nav",
      h(PageBreadcrumbs, { showLogo: true, separateTitle: false })
    ),
    h("div.toolbar-actions", actions),
  ]);
}

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

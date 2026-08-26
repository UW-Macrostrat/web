/** App-level chrome for the hybrid frame — brand, global nav, footer.
 *
 * These are compact, app-shaped counterparts to the site's content-page
 * chrome. They draw their link data from `~/layouts/footer` rather than
 * forking it, and the full site footer is always exactly one interaction
 * away (via the sheet) in *both* chrome modes — so collapsing chrome never
 * means some navigation becomes unreachable.
 *
 * Note: the site's `Navbar` is deliberately not reused here. It wraps
 * `StickyHeader`, whose scroll-driven `position: fixed` backdrop is sized to
 * the viewport — wrong inside a viewport-locked frame that never scrolls.
 */

import { AnchorButton, Button } from "@blueprintjs/core";
import { useAtom } from "jotai";
import classNames from "classnames";

import { MacrostratIconStyle } from "~/components/general";
import { SiteTitle } from "~/components";
import { ThemeButton } from "~/components/theme-button";
import { Footer, dataNavItems, type NavLinkItem } from "~/layouts/footer";

import h from "./chrome.module.sass";
import { footerSheetOpenAtom } from "./state";

export function AppHeaderBar() {
  return h("div.app-header-bar", [
    h(SiteTitle, {
      logoStyle: MacrostratIconStyle.SIMPLE,
      className: "brand",
    }),
    h(NavLinkRow, { items: dataNavItems }),
    h("div.header-actions", [h(ThemeButton)]),
  ]);
}

/** The compact brand mark shown in the page bar when app chrome is collapsed,
 * so there's always a way back out of a map-dominant view. */
export function BrandMark() {
  return h(SiteTitle, {
    logoStyle: MacrostratIconStyle.SIMPLE,
    className: "brand brand-compact",
  });
}

function NavLinkRow({ items }: { items: NavLinkItem[] }) {
  return h(
    "nav.nav-link-row",
    items.map((item) =>
      h(
        AnchorButton,
        {
          key: item.href,
          href: item.href,
          icon: item.icon,
          minimal: true,
          small: true,
          className: "nav-link-button",
        },
        item.text
      )
    )
  );
}

export function AppFooterBar() {
  return h("div.app-footer-bar", [
    h(NavLinkRow, { items: dataNavItems }),
    h(FooterSheetTrigger, { className: "footer-bar-trigger" }),
  ]);
}

/** Opens the full site footer. Rendered in the footer bar when chrome is
 * reserved, and as a floating pill when it's collapsed. */
export function FooterSheetTrigger({ className = null, floating = false }) {
  const [open, setOpen] = useAtom(footerSheetOpenAtom);

  let text = "More";
  if (open) {
    text = "Close";
  }

  return h(
    Button,
    {
      className: classNames("footer-sheet-trigger", className, { floating }),
      minimal: !floating,
      small: true,
      rightIcon: open ? "chevron-down" : "chevron-up",
      onClick: () => setOpen(!open),
    },
    text
  );
}

export function FooterSheet() {
  const [open, setOpen] = useAtom(footerSheetOpenAtom);

  return h(
    "div.footer-sheet-scrim",
    {
      className: classNames({ open }),
      "aria-hidden": !open,
      onClick: () => setOpen(false),
    },
    h(
      "div.footer-sheet",
      { onClick: (evt) => evt.stopPropagation() },
      h(Footer, { className: "sheet-footer" })
    )
  );
}

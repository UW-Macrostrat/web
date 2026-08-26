import hyper from "@macrostrat/hyper";
import styles from "./list-page.module.sass";
import { StickyHeader } from "~/components";

const h = hyper.styled(styles);

interface LexListPageProps {
  /** Intro/description block rendered above the results. */
  description?: React.ReactNode;
  /** Search/filter controls, pinned in a sticky header above the results. */
  controls?: React.ReactNode;
  /** The results region (list, cards, scroll view). */
  children: React.ReactNode;
  className?: string;
}

export function LexListPage(props: LexListPageProps) {
  /** Standard content wrapper for a `/lex` list page. Renders page *content* only —
   * breadcrumbs, page title, and footer come from the `pageStyle`-driven layout
   * (`IndexPage`/`ContentPage`). Pages using this must NOT wrap themselves in
   * `ContentPage`/`FullscreenPage` or render their own `PageBreadcrumbs`/`Footer`;
   * doing so is what produced the duplicated chrome across the migrated lex pages.
   */
  const { description, controls, children, className } = props;

  let descriptionBlock = null;
  if (description != null) {
    descriptionBlock = h("div.lex-list-description", description);
  }

  let controlsHeader = null;
  if (controls != null) {
    controlsHeader = h(
      StickyHeader,
      { className: "lex-list-controls" },
      controls,
    );
  }

  return h("div.lex-list-page", { className }, [
    descriptionBlock,
    controlsHeader,
    h("div.lex-list-content", children),
  ]);
}

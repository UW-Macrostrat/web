import h from "@macrostrat/hyper";
import {
  useInteractionProps,
  isClickable,
  type MacrostratItemIdentifier,
} from "@macrostrat/data-components";
import classNames from "classnames";
import { useLinkIsActive } from "./Link";

interface MacrostratLinkProps {
  /** The Macrostrat data item to link to (lithology, interval, strat name,
   * column, project, unit, environment). */
  item: MacrostratItemIdentifier;
  children: React.ReactNode;
  className?: string;
  /** Set false to render children without any link affordance. */
  interactive?: boolean;
  target?: string;
  onClick?: (event: React.MouseEvent) => void;
}

export function MacrostratLink(props: MacrostratLinkProps) {
  /** A link to a Macrostrat data item. Resolves its href/target/onClick from the
   * ambient `MacrostratInteractionProvider` (mounted app-wide via `BaseContentPage`),
   * so navigation stays consistent and client-side (Vike intercepts the anchor).
   *
   * Prefer this over raw `h("a", { href })`, `window.open`, or hand-built `/lex/...`
   * hrefs on lexicon pages. Non-clickable items degrade to plain text.
   */
  const { item, children, className, interactive = true, ...rest } = props;

  const interactionProps = useInteractionProps(item, interactive);
  // Hook must run unconditionally, before the early return below.
  const isActive = useLinkIsActive(interactionProps.href ?? undefined);

  if (!isClickable(interactionProps)) {
    return h("span", { className }, children);
  }

  return h(
    "a",
    {
      ...interactionProps,
      ...rest,
      className: classNames(className, { "is-active": isActive }),
    },
    children,
  );
}

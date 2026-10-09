/** Element overrides for site-page markdown, keyed by Obsidian callout kind, so
 * vault prose can carry website layout and still read plainly in Obsidian:
 *
 *   > [!cards]
 *   > - [Geologic maps](/map): Maps from hundreds of sources.
 *   > - [[Data services|API]] #beta: Build on the data.
 *
 * is a grid of link cards (a `#tag` becomes a tag on the card), and
 *
 *   > [!logo]
 *   > Macrostrat is a data system for the Earth's crust.
 *
 * sets its text beside the Macrostrat logo, over the homepage's cover photo.
 *
 *   > [!panels]
 *   > - **Data**
 *   >   - [Geologic maps](/map): Maps from hundreds of sources.
 *   > - [Documentation](/docs): How Macrostrat works.
 *   >   - Concepts and data model
 *
 * is a row of panels. A bold item is a headed group of link cards; a linked
 * item is one clickable panel, its nested items a plain list of topics.
 *
 *   > [!cite]
 *   > - [Data and analysis](https://doi.org/10.1029/2018gc007467): Cite when…
 *
 * is a card per paper: the label and guidance, then the citation formatted
 * from `Site/data/publications.json`.
 * Rendered to static HTML on the
 * server, so nothing here may depend on hydration. */
import { Children, createElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Tag } from "@blueprintjs/core";
import { LinkCard } from "~/components/cards";
import { MacrostratIcon } from "~/components/general";
import { webAssetsPrefix } from "@macrostrat-web/settings";
import { publicationByDOI } from "./citations";
import { readDataFile } from "./data-files";
import h from "./site-pages.module.sass";

export const siteMarkdownComponents = { div: CalloutOrDiv };

function CalloutOrDiv(props) {
  const kind = props["data-callout"];
  if (kind === "cards") return h(CardGrid, { body: calloutBody(props.children) });
  if (kind === "logo") return h(LogoCallout, { body: calloutBody(props.children) });
  if (kind === "panels") return h(PanelGrid, { body: calloutBody(props.children) });
  if (kind === "cite") return h(CiteList, { body: calloutBody(props.children) });
  return createElement("div", props);
}

/** A callout's content without its title paragraph or whitespace. */
function calloutBody(children: ReactNode): ReactNode[] {
  return Children.toArray(children).filter((child) => {
    if (typeof child === "string") return child.trim() !== "";
    if (isValidElement<any>(child)) return child.props.className !== "callout-title";
    return true;
  });
}

const coverImageURL = `${webAssetsPrefix}/main-page/cover_large.jpg`;

function LogoCallout({ body }: { body: ReactNode[] }) {
  return h("div.logo-callout", { style: { backgroundImage: `url('${coverImageURL}')` } }, [
    h("div.logo-callout-body", { key: "body" }, body),
    h(MacrostratIcon, { key: "logo", className: "logo-callout-icon" }),
  ]);
}

function CardGrid({ body }: { body: ReactNode[] }) {
  const items = body.filter(isList).flatMap(listItems);
  return h(
    "div.card-grid",
    items.map((item, i) => h(MarkdownCard, { key: i, nodes: listItemContent(item) }))
  );
}

function PanelGrid({ body }: { body: ReactNode[] }) {
  const items = body.filter(isList).flatMap(listItems);
  return h(
    "div.panel-grid",
    items.map((item, i) => h(Panel, { key: i, item }))
  );
}

function Panel({ item }: { item: ReactElement<any> }) {
  const { head, nested } = splitListItem(item);
  const first = head[0];
  if (isElement(first) && first.props.href != null) {
    return h(LinkedPanel, { link: first, rest: head.slice(1), nested });
  }
  let title: ReactNode = null;
  let rest = head;
  if (isElement(first) && first.type === "strong") {
    title = h("h3.panel-title", first.props.children);
    rest = head.slice(1);
  }
  const { description } = trailingParts(rest);
  let descriptionNode = null;
  if (description.length > 0) {
    descriptionNode = h("p.panel-description", description);
  }
  return h("div.panel-group", [
    title,
    descriptionNode,
    h(
      "div.panel-items",
      nested.map((n, i) => h(MarkdownCard, { key: i, nodes: listItemContent(n), density: "list" }))
    ),
  ]);
}

function CiteList({ body }: { body: ReactNode[] }) {
  const items = body.filter(isList).flatMap(listItems);
  return h(
    "div.cite-list",
    items.map((item, i) => h(CiteCard, { key: i, nodes: listItemContent(item) }))
  );
}

function CiteCard({ nodes }: { nodes: ReactNode[] }) {
  const card = cardParts(nodes);
  if (card == null) return null;
  let citation = null;
  let publication = null;
  const doi = /doi\.org\/(.+)$/.exec(card.href)?.[1];
  if (doi != null) {
    publication = publicationByDOI(readDataFile("publications") ?? [], decodeURIComponent(doi));
  }
  if (publication != null) {
    citation = h("span.cite-citation", { dangerouslySetInnerHTML: { __html: publication.html } });
  } else {
    console.warn(`[site-pages] no publication in the library for ${card.href}`);
  }
  let description = null;
  if (card.description.length > 0) {
    description = h("p.card-description", card.description);
  }
  return h(LinkCard, { href: card.href, title: card.title }, [description, citation]);
}

/** The whole panel is a link, so its topics cannot be links themselves. */
function LinkedPanel({ link, rest, nested }) {
  const { tags, description } = trailingParts(rest);
  let descriptionNode = null;
  if (description.length > 0) {
    descriptionNode = h("p.card-description", description);
  }
  let topics = null;
  if (nested.length > 0) {
    topics = h(
      "ul.panel-topics",
      nested.map((n, i) => h("li", { key: i }, listItemContent(n)))
    );
  }
  return h(
    LinkCard,
    {
      href: link.props.href,
      className: "linked-panel",
      title: h("span.card-title", [link.props.children, tags.map((t) => h(CardTag, { key: t, tag: t }))]),
    },
    [descriptionNode, topics]
  );
}

interface CardParts {
  href: string;
  title: ReactNode;
  tags: string[];
  description: ReactNode[];
}

function MarkdownCard({ nodes, density }: { nodes: ReactNode[]; density?: "list" }) {
  const card = cardParts(nodes);
  if (card == null) return null;
  let description = null;
  if (card.description.length > 0) {
    description = h("p.card-description", card.description);
  }
  return h(
    LinkCard,
    {
      href: card.href,
      density,
      title: h("span.card-title", [card.title, card.tags.map((t) => h(CardTag, { key: t, tag: t }))]),
    },
    description
  );
}

function CardTag({ tag }: { tag: string }) {
  if (tag === "beta") return h(Tag, { intent: "warning" }, "Beta");
  return h(Tag, { minimal: true }, tag);
}

/** The first link is the card's target and title; the text after it, less a
 * leading separator and any `#tags`, is the description. */
function cardParts(nodes: ReactNode[]): CardParts | null {
  const linkIndex = nodes.findIndex((n) => isElement(n) && n.props.href != null);
  if (linkIndex === -1) return null;
  const link = nodes[linkIndex] as ReactElement<any>;
  return { href: link.props.href, title: link.props.children, ...trailingParts(nodes.slice(linkIndex + 1)) };
}

/** The text after a title, less a leading separator and any `#tags`. */
function trailingParts(nodes: ReactNode[]): { tags: string[]; description: ReactNode[] } {
  const tags: string[] = [];
  const description: ReactNode[] = [];
  for (const node of nodes) {
    if (typeof node !== "string") {
      description.push(node);
      continue;
    }
    let text = node.replace(/(^|\s)#([\w-]+)/g, (_, space, tag) => {
      tags.push(tag.toLowerCase());
      return space;
    });
    if (description.length === 0) text = text.replace(/^\s*[:—–-]?\s*/, "");
    if (text !== "") description.push(text);
  }
  return { tags, description };
}

function listItems(list: ReactElement<any>): ReactElement<any>[] {
  return Children.toArray(list.props.children).filter(isElement);
}

/** A list item's own content, paragraphs unwrapped, and its nested list's items. */
function splitListItem(item: ReactElement<any>): { head: ReactNode[]; nested: ReactElement<any>[] } {
  const head: ReactNode[] = [];
  const nested: ReactElement<any>[] = [];
  for (const child of Children.toArray(item.props.children)) {
    if (isList(child)) {
      nested.push(...listItems(child));
    } else if (isElement(child) && child.type === "p") {
      head.push(...Children.toArray(child.props.children));
    } else if (typeof child !== "string" || child.trim() !== "") {
      head.push(child);
    }
  }
  return { head, nested };
}

/** A loose list wraps each item's content in a paragraph. */
function listItemContent(item: ReactElement<any>): ReactNode[] {
  const children = Children.toArray(item.props.children).filter(
    (c) => typeof c !== "string" || c.trim() !== ""
  );
  if (children.length === 1 && isElement(children[0]) && children[0].type === "p") {
    return Children.toArray(children[0].props.children);
  }
  return children;
}

function isElement(node: unknown): node is ReactElement<any> {
  return isValidElement(node);
}

function isList(node: ReactNode): node is ReactElement<any> {
  return isElement(node) && (node.type === "ul" || node.type === "ol");
}

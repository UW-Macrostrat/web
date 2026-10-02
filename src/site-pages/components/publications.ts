import { useState } from "react";
import { Button } from "@blueprintjs/core";
import h from "./components.module.sass";
import type { Publication, PlatformPaper } from "../citations";

/** The papers to cite for the platform, at the top of /publications and on /about. */
export function CiteMacrostrat({ platformPapers }: { platformPapers: PlatformPaper[] }) {
  return h(
    "ul.cite-list",
    (platformPapers ?? []).map((p) =>
      h("li.cite-item", { key: p.id }, [
        h("span.cite-note", p.note),
        h(Citation, { publication: p }),
        h(CopyActions, { publication: p }),
      ])
    )
  );
}

/** The library's bibliography, newest first, grouped by year. */
export function Bibliography({ publications }: { publications: Publication[] }) {
  const groups = groupByYear(publications ?? []);
  return h(
    "div.bibliography",
    groups.map(([year, entries]) =>
      h("section.pub-year", { key: year }, [
        h("h3.tier-label", year),
        h(
          "ul.pub-entries",
          entries.map((p) => h("li.pub-entry", { key: p.id }, [h(Citation, { publication: p }), h(CopyActions, { publication: p })]))
        ),
      ])
    )
  );
}

function groupByYear(publications: Publication[]): [string, Publication[]][] {
  const groups = new Map<string, Publication[]>();
  for (const p of publications) {
    const year = String(p.year ?? "Undated");
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(p);
  }
  return [...groups.entries()];
}

function Citation({ publication }: { publication: Publication }) {
  let link = null;
  if (publication.url != null) {
    link = h("a.pub-link", { href: publication.url, target: "_blank", rel: "noopener" }, "link");
  }
  return h("span.pub-citation", [h("span", { dangerouslySetInnerHTML: { __html: publication.html } }), link]);
}

function CopyActions({ publication }: { publication: Publication }) {
  return h("span.pub-actions", [
    h(CopyButton, { label: "Copy", title: "Copy citation", value: () => plainText(publication.html) }),
    h(CopyButton, { label: "BibTeX", title: "Copy BibTeX", value: () => publication.bibtex }),
  ]);
}

function CopyButton({ label, title, value }: { label: string; title: string; value: () => string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  let icon = "clipboard";
  if (copied) icon = "tick";
  return h(Button, { small: true, minimal: true, icon, onClick: copy, title }, label);
}

function plainText(html: string): string {
  return new DOMParser().parseFromString(html, "text/html").body.textContent?.trim() ?? "";
}

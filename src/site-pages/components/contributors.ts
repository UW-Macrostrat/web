import { useMemo, useState } from "react";
import { InputGroup, Tag } from "@blueprintjs/core";
import h from "./components.module.sass";

export function ContributorDirectory({ people }) {
  const entries: any[] = people?.people ?? [];
  const roles: Record<string, string> = people?.roles ?? {};
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((p) => {
      if (role != null && !(p.roles ?? []).includes(role)) return false;
      if (q === "") return true;
      const hay = [p.name, p.title, p.affiliation].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [entries, query, role]);

  const current = filtered.filter((p) => p.status !== "former");
  const former = filtered.filter((p) => p.status === "former");

  let formerBlock = null;
  if (former.length > 0) {
    formerBlock = h("div.people-group.former", [
      h("h3.tier-label", "Former members and collaborators"),
      h("ul.people-list", former.map((p) => h(PersonCard, { key: p.id, person: p, roles }))),
    ]);
  }

  return h("div.contributor-directory", [
    h("div.directory-controls", [
      h(InputGroup, {
        leftIcon: "search",
        placeholder: "Search by name, title or affiliation",
        value: query,
        onChange: (e) => setQuery(e.target.value),
      }),
      h(
        "div.role-filters",
        Object.entries(roles).map(([id, description]) =>
          h(
            Tag,
            {
              key: id,
              interactive: true,
              minimal: role !== id,
              intent: role === id ? "primary" : "none",
              title: description,
              onClick: () => setRole(role === id ? null : id),
            },
            id
          )
        )
      ),
    ]),
    h("ul.people-list", current.map((p) => h(PersonCard, { key: p.id, person: p, roles }))),
    formerBlock,
  ]);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

function PersonCard({ person, roles }) {
  const { name, title, affiliation, website, orcid, photo_url, note } = person;

  let photo;
  if (photo_url != null) {
    photo = h("img.person-photo", { src: photo_url, alt: "" });
  } else {
    photo = h("div.person-photo.placeholder", initials(name));
  }

  let nameEl;
  if (website != null) {
    nameEl = h("a.person-name", { href: website, target: "_blank", rel: "noopener" }, name);
  } else {
    nameEl = h("span.person-name", name);
  }

  let orcidEl = null;
  if (orcid != null) {
    orcidEl = h(
      "a.person-orcid",
      { href: `https://orcid.org/${orcid}`, target: "_blank", rel: "noopener" },
      "ORCID"
    );
  }

  const roleTags = (person.roles ?? []).map((r) =>
    h(Tag, { key: r, minimal: true, title: roles[r] }, r)
  );

  return h("li.person-card", [
    photo,
    h("div.person-body", [
      nameEl,
      h.if(title != null)("span.person-title", title),
      h.if(affiliation != null)("span.person-affiliation", affiliation),
      h.if(note != null)("p.person-note", note),
      h("div.person-tags", [roleTags, orcidEl]),
    ]),
  ]);
}

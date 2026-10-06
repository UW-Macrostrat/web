import { useMemo, useState } from "react";
import { InputGroup, PopoverNext, Tag } from "@blueprintjs/core";
import h from "./components.module.sass";

export function ContributorDirectory({ people }) {
  const entries: any[] = people?.people ?? [];
  const roles: Record<string, string> = people?.roles ?? {};
  const labDefinition: string | undefined = people?.lab_definition;
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [labOnly, setLabOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((p) => {
      if (role != null && !(p.roles ?? []).includes(role)) return false;
      if (labOnly && labPositions(p) == null) return false;
      if (q === "") return true;
      const hay = [p.name, p.title, p.affiliation].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [entries, query, role, labOnly]);

  const current = filtered.filter((p) => !isFormer(p));
  const former = filtered.filter((p) => isFormer(p));

  let formerBlock = null;
  if (former.length > 0) {
    formerBlock = h("div.people-group.former", [
      h("h3.tier-label", "Former members and collaborators"),
      h("ul.people-list", former.map((p) => h(PersonCard, { key: p.id, person: p }))),
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
      h("div.role-filters", [
        h(FilterTag, {
          key: "lab",
          id: "lab",
          label: "Macrostrat lab",
          definition: labDefinition,
          active: labOnly,
          onClick: () => setLabOnly(!labOnly),
        }),
        h("span.filter-divider", { key: "divider" }),
        Object.entries(roles).map(([id, definition]) =>
          h(FilterTag, {
            key: id,
            id,
            label: id,
            definition,
            active: role === id,
            onClick: () => setRole(role === id ? null : id),
          })
        ),
      ]),
    ]),
    h("ul.people-list", current.map((p) => h(PersonCard, { key: p.id, person: p }))),
    formerBlock,
  ]);
}

interface LabPosition {
  title?: string;
  start?: number;
  end?: number;
}

/** `lab` is `current`, `former`, a position or a list of positions; a position
 * without an end is current. */
function labPositions(person): LabPosition[] | null {
  const { lab } = person;
  if (lab == null) return null;
  if (Array.isArray(lab)) return lab;
  if (typeof lab === "object") return [lab];
  return [];
}

function isCurrentLabMember(person): boolean {
  const { lab } = person;
  if (lab === "former") return false;
  if (lab === "current" || lab === true) return true;
  return (labPositions(person) ?? []).some((p) => p.end == null);
}

/** An explicit `status` wins: a former lab member may still contribute. */
function isFormer(person): boolean {
  if (person.status != null) return person.status === "former";
  if (labPositions(person) == null) return false;
  return !isCurrentLabMember(person);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

/** A tag colored by a hue derived from its id, so a role keeps its color everywhere. */
function ColorTag({ id, active = false, children, ...rest }) {
  const style = { "--tag-hue": tagHue(id) } as React.CSSProperties;
  let className = "color-tag";
  if (active) className += " active";
  return h(Tag, { ...rest, minimal: true, className, style }, children);
}

function tagHue(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 16777619) >>> 0;
  }
  return hash % 360;
}

function FilterTag({ id, label, definition, active, onClick }) {
  const tag = h(ColorTag, { id, active, interactive: true, onClick }, label);
  if (definition == null) return tag;
  return h(
    PopoverNext,
    {
      content: h("span.tag-definition", definition),
      interactionKind: "hover-target",
      popoverClassName: "tag-definition-popover",
      placement: "top",
      arrow: false,
      hoverOpenDelay: 200,
      autoFocus: false,
      enforceFocus: false,
    },
    tag
  );
}

function PersonCard({ person }) {
  const { name, title, affiliation, website, orcid, photo_url, note, contributions } = person;

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

  // Positions and dates are recorded but not shown until they have been reviewed.
  let labTag = null;
  if (labPositions(person) != null) {
    let label = "Macrostrat lab";
    if (!isCurrentLabMember(person)) label += " · former";
    labTag = h(ColorTag, { key: "lab", id: "lab" }, label);
  }

  const roleTags = (person.roles ?? []).map((r) => h(ColorTag, { key: r, id: r }, r));

  let contributionList = null;
  if (contributions?.length > 0) {
    contributionList = h(
      "ul.person-contributions",
      contributions.map((c) => h("li", { key: c }, c))
    );
  }

  return h("li.person-card", [
    photo,
    h("div.person-body", [
      nameEl,
      h.if(title != null)("span.person-title", title),
      h.if(affiliation != null)("span.person-affiliation", affiliation),
      h.if(note != null)("p.person-note", note),
      contributionList,
      h("div.person-tags", [labTag, roleTags, orcidEl]),
    ]),
  ]);
}

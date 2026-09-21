import h from "./components.module.sass";

/** The main repositories, by hand until the list is fetched from GitHub at build. */
const repositories = [
  { name: "macrostrat", org: "UW-Macrostrat", what: "Database management, services and the command line" },
  { name: "web", org: "UW-Macrostrat", what: "The website" },
  { name: "web-components", org: "UW-Macrostrat", what: "Shared React components and the design system" },
  { name: "python-libraries", org: "UW-Macrostrat", what: "Python helper libraries" },
  { name: "macrostrat-api", org: "UW-Macrostrat", what: "The v2 API" },
  { name: "rockd", org: "UW-Macrostrat", what: "The Rockd mobile app and API" },
  { name: "docs", org: "Macrostrat", what: "This documentation and the site's prose" },
  { name: "column-ingestion", org: "Macrostrat", what: "The stratigraphic column ingestion format" },
];

export function RepositoryList() {
  return h(
    "ul.repo-list",
    repositories.map((r) =>
      h("li.repo", { key: `${r.org}/${r.name}` }, [
        h("a.repo-name", { href: `https://github.com/${r.org}/${r.name}` }, `${r.org}/${r.name}`),
        h("span.repo-what", r.what),
      ])
    )
  );
}

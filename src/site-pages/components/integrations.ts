import h from "./components.module.sass";

/** Systems exchanging data with Macrostrat in both directions. */
export function IntegrationList({ integrations }) {
  return h(SystemList, { integrations, direction: "both" });
}

/** Sources Macrostrat builds on. */
export function ProviderList({ integrations }) {
  return h(SystemList, { integrations, direction: "in" });
}

function SystemList({ integrations, direction }) {
  const items: any[] = (integrations?.integrations ?? []).filter(
    (item) => item.direction === direction
  );
  return h(
    "ul.integration-list",
    items.map((item) =>
      h("li.integration", { key: item.id }, [
        h("a.integration-name", { href: item.url, target: "_blank", rel: "noopener" }, item.name),
        h("p.integration-what", item.what),
      ])
    )
  );
}

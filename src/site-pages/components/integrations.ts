import h from "./components.module.sass";

const directionLabels: Record<string, string> = {
  in: "data in",
  out: "data out",
  both: "two-way",
};

export function IntegrationList({ integrations }) {
  const items: any[] = integrations?.integrations ?? [];
  return h(
    "ul.integration-list",
    items.map((item) =>
      h("li.integration", { key: item.id }, [
        h("div.integration-head", [
          h("a.integration-name", { href: item.url, target: "_blank", rel: "noopener" }, item.name),
          h("span.integration-direction", directionLabels[item.direction] ?? item.direction),
        ]),
        h("p.integration-what", item.what),
      ])
    )
  );
}

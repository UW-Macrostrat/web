import h from "./components.module.sass";

export function ContactBlock({ contact }) {
  const channels: any[] = contact?.channels ?? [];
  return h(
    "ul.contact-list",
    channels.map((c) =>
      h("li.contact-channel", { key: c.kind }, [
        h("span.contact-label", c.label),
        h("a.contact-value", { href: c.url }, c.value),
      ])
    )
  );
}

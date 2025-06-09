import { Image, Navbar, Footer } from "~/components/general";
import h from "./main.module.sass";

export function Page() {
  return h("div.total", [
    h(Navbar),
    h("div.donate-container", [
      h("div.text-donate", [
        h(
          "a",
          {
            href: "https://secure.supportuw.org/give/?id=E0A03FA3-B2A0-431C-83EE-A121A04EEB5D",
            target: "_blank",
          },
          [h("h1.title.donate-title", "Donate Now")]
        ),
        h("div.donate-info", [
          "Grant funding, principally from the ",
          h(
            "a",
            { href: "http://www.nsf.gov", target: "_blank" },
            "U.S. National Science Foundation"
          ),
          ", got Macrostrat off the ground and keeps us innovating, but maintaining and growing a free and open digital resource involves ongoing expenses beyond the grant cycle, like annual certificate renewals, cloud server hosting and backup storage that keep your connection safe, domain name registrations that keep us located on the web, and system upgrades to keep us fast and efficient. If you would like to help us continue to grow and provide free resources, you can do so with a one-time or recurring gift to the UW Foundation Paleontology Program Fund in Geology. Thank you!",
        ]),
      ]),
      h(Image, { className: "back-img donate-img", src: "donate_medium.jpg" }),
    ]),
    h(Footer),
  ]);
}

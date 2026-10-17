import h from "@macrostrat/hyper";

/** Seen only without JavaScript; the head script redirects everyone else. */
export function Page() {
  return h("p", [
    "Sift is now part of Macrostrat's ",
    h("a", { href: "/lex" }, "lexicon"),
    ".",
  ]);
}

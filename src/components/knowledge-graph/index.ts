/** Shared code for the knowledge-graph pages under `/knowledge-graph`
 * (papers, source texts, reviews, runs, entity types). This barrel is server-safe: the interactive editor
 * (which pulls in `@macrostrat/feedback-components`) is exposed only through
 * `clientOnly()` islands, so pages can import from here in SSR modules. */
import { clientOnly } from "~/components/lex/client-only";

export * from "./types";
export * from "./api";
export * from "./components";
export * from "./route";
export { MATCH_LINKS } from "./match-links";

/** Read-only entity view for one or more runs (client island). */
export const ExtractionViewClient = clientOnly(() =>
  import("./editor.client").then((m) => m.ExtractionViewForRuns)
);

/** The feedback editor for one or more runs (client island). Shows the
 * read-only view plus a sign-in prompt for anonymous visitors. */
export const FeedbackEditorClient = clientOnly(() =>
  import("./editor.client").then((m) => m.FeedbackEditorForRuns)
);

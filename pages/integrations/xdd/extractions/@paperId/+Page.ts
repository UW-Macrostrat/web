import h from "@macrostrat/hyper";

import { ContentPage } from "~/layouts";
import { PageBreadcrumbs } from "~/components";
import { usePageContext } from "vike-react/usePageContext";
import { ExtractionContext, enhanceData } from "../lib";
import {
  useEntityTypeIndex,
  useModelIndex,
  usePostgresQuery,
} from "../lib/data-service";

export function Page() {
  return h(ContentPage, [h(PageBreadcrumbs), h(PageMain)]);
}

function PageMain() {
  return h("div", [h(ExtractionIndex)]);
}

function ExtractionIndex() {
  const { routeParams } = usePageContext();
  const { paperId } = routeParams;

  const models = useModelIndex();
  const entityTypes = useEntityTypeIndex();

  const paper = usePostgresQuery("kg_publication_entities", {
    subject: "paper_id",
    predicate: paperId,
  })?.[0];

  const data = usePostgresQuery("kg_context_entities", {
    subject: "paper_id",
    predicate: paperId,
  });

  if (data == null || models == null || paper == null || entityTypes == null) {
    return h("div", "Loading...");
  }

  return h([
    h("h1", paper.citation?.title ?? "Model extractions"),
    data.map((d) => {
      return h(ExtractionContext, {
        data: enhanceData(d, models, entityTypes),
        entityTypes,
      });
    }),
  ]);
}

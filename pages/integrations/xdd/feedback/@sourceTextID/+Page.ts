import h from "@macrostrat/hyper";
import { ContentPage } from "~/layouts";
import { PageBreadcrumbs } from "~/components";
import { usePageContext } from "vike-react/usePageContext";
import { enhanceData, ExtractionContext } from "../../extractions/lib";
import {
  usePostgresQuery,
  useModelIndex,
  useEntityTypeIndex,
} from "../../extractions/lib/data-service";

// noinspection JSUnusedGlobalSymbols
export function Page() {
  return h(ContentPage, [h(PageBreadcrumbs), h(PageMain)]);
}

function PageMain() {
  return h("div", [h(ExtractionIndex)]);
}

function ExtractionIndex() {
  const { routeParams } = usePageContext();
  const { sourceTextID } = routeParams;

  const models = useModelIndex();
  const entityTypes = useEntityTypeIndex();

  const data = usePostgresQuery("kg_context_entities", {
    subject: "source_text",
    predicate: sourceTextID,
  });

  if (data == null || models == null || entityTypes == null) {
    return h("div", "Loading...");
  }

  return h([
    //h("h1", paper.citation?.title ?? "Model extractions"),
    data.map((d) => {
      return h(ExtractionContext, {
        data: enhanceData(d, models, entityTypes),
        entityTypes,
      });
    }),
  ]);
}

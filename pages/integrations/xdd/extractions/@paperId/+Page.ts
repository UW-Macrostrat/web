import h from "@macrostrat/hyper";

import { ContentPage } from "~/layouts";
import { PageBreadcrumbs } from "~/components";
import { usePageContext } from "vike-react/usePageContext";
import {
  ExtractionContext,
  enhanceData,
  FeedbackComponent
} from "@macrostrat/feedback-components";
import {
  useEntityTypeIndex,
  useModelIndex,
  usePostgresQuery,
} from "../data-service";
import { MatchedEntityLink } from "../match";
import { DataField } from "~/components/unit-details";
import { FlexRow } from "@macrostrat/ui-components";
import { MultiSelect } from "@blueprintjs/select"
import { contextPanelIsInitiallyOpen } from "#/map/map-interface/app-state";

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

  const filters = {
    subject: "paper_id",
    predicate: paperId,
  };

  const paper = usePostgresQuery("kg_publication_entities", filters)?.[0];

  const data = usePostgresQuery("kg_context_entities", filters);

  const feedback = usePostgresQuery("kg_extraction_feedback_type");

  if (data == null || models == null || paper == null || entityTypes == null) {
    return h("div", "Loading...");
  }

  console.log("feedback", feedback);

  return h([
    h.if(feedback.length > 0)(
      'h3',
      "Extraction feedback"
    ),

    h("h1", paper.citation?.title ?? "Model extractions"),
    data.map((d) => {
      const data = enhanceData(d, models, entityTypes)
      console.log(data);

      const { entities = [], paragraph_text, model, model_run, source_text, version_id } = data;

      return h([
        h(FlexRow, { justifyContent: "space-between", alignItems: "center" }, [
          h("a", { href: `../feedback/${d.source_text}` }, h('h2', "View feedback")),
          h('div.data', [
            h(DataField, {
              label: "Model run",
              value: "#" + model_run,
            }),
            h(DataField, {
              label: "Version",
              value: "#" + version_id,
            }),
            h(DataField, {
              label: "Date",
              value: new Date(model.first_run).toLocaleDateString(),
            }),
          ]),
        ]),

        h(FeedbackComponent, {
          entities,
          text: paragraph_text,
          model,
          entityTypes,
          sourceTextID: source_text,
          runID: model_run,
          allowOverlap: true,
          view: true,
        }),
      ]);
    }),
  ]);
}
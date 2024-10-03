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
import { FeedbackComponent } from "./lib";
import { JSONView, usePageDevTool } from "@macrostrat/ui-components";
import { create } from "zustand";
import { useEffect } from "react";
import { Card, NonIdealState, Spinner } from "@blueprintjs/core";

/**
 * Get a single text window for feedback purposes
 */

// noinspection JSUnusedGlobalSymbols
export function Page() {
  return h(ContentPage, [h(PageBreadcrumbs), h(ExtractionIndex)]);
}

const useStore = create((set) => {
  return {
    entities: null,
  };
});

function ExtractionIndex() {
  const { routeParams } = usePageContext();
  const { sourceTextID } = routeParams;

  usePageDevTool("Feedback", FeedbackDevTool);

  const models = useModelIndex();
  const entityTypes = useEntityTypeIndex();

  const data = usePostgresQuery("kg_context_entities", {
    subject: "source_text",
    predicate: sourceTextID,
  });

  useEffect(() => {
    if (data == null) return;
    useStore.setState({ entities: data[0]?.entities });
  }, [data]);

  if (data == null || models == null || entityTypes == null) {
    return h("div", "Loading...");
  }

  const window = data[0];

  return h([
    //h("h1", paper.citation?.title ?? "Model extractions"),
    h(FeedbackComponent),
    h(ExtractionContext, {
      data: enhanceData(window, models, entityTypes),
      entityTypes,
    }),
  ]);
}

function FeedbackDevTool() {
  const entities = useStore((state) => state.entities);
  if (entities == null)
    return h(NonIdealState, { icon: h(Spinner), title: "Loading..." });

  return h(JSONView, { data: entities, showRoot: false });
}

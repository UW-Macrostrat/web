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
import { JSONView } from "@macrostrat/ui-components";
import { create } from "zustand";
import { useEffect } from "react";
import { NonIdealState, OverlaysProvider, Spinner } from "@blueprintjs/core";

/**
 * Get a single text window for feedback purposes
 */

// noinspection JSUnusedGlobalSymbols
export function Page() {
  return h(
    OverlaysProvider,
    h(ContentPage, [
      h(PageBreadcrumbs),
      h("h1", "Feedback"),
      h(ExtractionIndex),
    ])
  );
}

const useStore = create((set) => {
  return {
    entities: null,
  };
});

function ExtractionIndex() {
  const { routeParams } = usePageContext();
  const { sourceTextID } = routeParams;

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

  const window = enhanceData(data[0], models, entityTypes);
  const { entities = [], paragraph_text, model } = window;

  return h([
    //h("h1", paper.citation?.title ?? "Model extractions"),
    h(FeedbackComponent, {
      entities,
      text: paragraph_text,
      model,
      entityTypes,
    }),
  ]);
}

function FeedbackDevTool() {
  const entities = useStore((state) => state.entities);
  if (entities == null)
    return h(NonIdealState, { icon: h(Spinner), title: "Loading..." });

  return h(JSONView, { data: entities, showRoot: false, keyPath: 0 });
}

FeedbackDevTool.title = "Feedback";

export const devTools = [FeedbackDevTool];

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
import { MenuItem } from "@blueprintjs/core";
import { useState } from "react";

export function Page() {
  return h(ContentPage, [h(PageBreadcrumbs), h(PageMain)]);
}

function PageMain() {
  return h("div", [h(ExtractionIndex)]);
}

function ExtractionIndex() {
  const { routeParams } = usePageContext();
  const { paperId } = routeParams;

  const [selectedFeedbackType, setSelectedFeedbackType] = useState();

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

  console.log('feedback', feedback);

  // Helpers
  const isItemSelected = (item) => selectedFeedbackType.includes(item);

  const handleItemSelect = (item) => {
    if (!isItemSelected(item)) {
      setSelectedFeedbackType([...selectedFeedbackType, item]);
    }
  };

  const handleTagRemove = (_tag, index) => {
    const next = [...selectedFeedbackType];
    next.splice(index, 1);
    setSelectedFeedbackType(next);
  };

  const itemPredicate = (query, item) =>
    item.type.toLowerCase().includes(query.toLowerCase());

  const itemRenderer = (item, { handleClick, modifiers }) => {
    if (!modifiers.matchesPredicate) return null;

    return h(MenuItem, {
      key: item.id,
      text: item.type,
      onClick: handleClick,
      active: modifiers.active,
      shouldDismissPopover: false,
    });
  };

  return h([
    h.if(feedback.length > 0)(
      'h3',
      "Extraction feedback"
    ),
    h.if(feedback.length > 0)(MultiSelect, {
      items: feedback,
      itemRenderer,
      itemPredicate,
      selectedItems: selectedFeedbackType,
      onItemSelect: handleItemSelect,
      onRemoveTag: handleTagRemove,
      tagRenderer: (item) => item.type,
      popoverProps: { minimal: true },
      fill: true,
    }),
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
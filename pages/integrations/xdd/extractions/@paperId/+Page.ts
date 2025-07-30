import h from "./main.module.sass";

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
import { AuthStatus, useAuth } from "@macrostrat/form-components";
import { DataField } from "~/components/unit-details";
import { FlexRow, SaveButton } from "@macrostrat/ui-components";
import { MultiSelect } from "@blueprintjs/select"
import { MenuItem, TextArea, Popover } from "@blueprintjs/core";
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

  const models = useModelIndex();
  const entityTypes = useEntityTypeIndex();

  const filters = {
    subject: "paper_id",
    predicate: paperId,
  };

  const paper = usePostgresQuery("kg_publication_entities", filters)?.[0];

  const data = usePostgresQuery("kg_context_entities", filters);

  if (data == null || models == null || paper == null || entityTypes == null) {
    return h("div", "Loading...");
  }

  const lexURL = "/lex"

  return h([
    h(FlexRow, { justifyContent: "space-between", alignItems: "center" }, [
      h(
        'h3',
        "Extraction feedback"
      ),
      h(AuthStatus)
    ]),
    h(Feedback),
    h("h1", paper.citation?.title ?? "Model extractions"),
    data.map((d) => {
      const data = enhanceData(d, models, entityTypes)

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
          matchLinks: {
            lithology: `${lexURL}/lithologies`,
            strat_name: `${lexURL}/strat-names`,
            lith_att: `${lexURL}/lith-atts`,
            concept: `${lexURL}/strat-concepts`,
            interval: `${lexURL}/intervals`,
          },
        }),
      ]);
    }),
  ]);
}

function Feedback() {  
  const [selectedFeedbackType, setSelectedFeedbackType] = useState([]);
  const [customFeedback, setCustomFeedback] = useState("");

  const loggedIn = useAuth().user !== null;
  const feedbackGiven = selectedFeedbackType.length > 0 || customFeedback.length > 0;

  const feedback = usePostgresQuery("kg_extraction_feedback_type");

  if (feedback == null) {
    return h("div", "Loading feedback types...");
  }

  const isItemSelected = (item) => selectedFeedbackType.includes(item);

  const handleItemSelect = (item) => {
    if (!isItemSelected(item)) {
      setSelectedFeedbackType([...selectedFeedbackType, item]);
    }
  };

  const handleItemDelete = (itemToDelete) => {
    const next = selectedFeedbackType.filter((item) => item.id !== itemToDelete.id);
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

  return h(FlexRow, { className: "feedback-flexbox" }, [
    h('div.inputs', [
      h(MultiSelect, {
        items: feedback.filter((f) => !isItemSelected(f)),
        itemRenderer,
        itemPredicate,
        selectedItems: selectedFeedbackType,
        onItemSelect: handleItemSelect,
        onRemove: handleItemDelete,
        tagRenderer: (item) => item.type,
        popoverProps: { minimal: true },
        fill: true,
      }),
      h(TextArea, {
        onChange: (e) => setCustomFeedback(e.target.value),
        placeholder: "Enter custom feedback here...",
        autoResize: true,
        className: 'input'
      })
    ]),
    h.if(!loggedIn || !feedbackGiven)(
      Popover,
      {
        interactionKind: "hover",
        content: h('p.popover', !loggedIn ? "You must be logged in to provide feedback" :
          !feedbackGiven ? "Select feedback types and/or provide custom feedback to submit" : null),
        position: "left",
      },
      h(SaveButton, {
        disabled: true,
      })
    ),
    h.if(loggedIn && feedbackGiven)(
      SaveButton,
      {
        className: "submit-feedback",
      },
      "Submit Feedback"
    ),
  ])
}
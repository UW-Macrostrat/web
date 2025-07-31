import h from "./+Page.client.module.sass";
import { ContentPage, FullscreenPage } from "~/layouts";
import { PageBreadcrumbs } from "~/components";
import { usePageContext } from "vike-react/usePageContext";
import {
  enhanceData,
  FeedbackComponent,
  GraphData,
  treeToGraph,
  TreeData,
} from "@macrostrat/feedback-components";
import {
  useEntityTypeIndex,
  useModelIndex,
  usePostgresQuery,
} from "../../extractions/data-service";
import { NonIdealState, OverlaysProvider, Spinner, Button } from "@blueprintjs/core";
import {
  ErrorBoundary,
  FlexRow,
  Pagination,
  Spacer,
  SaveButton,
} from "@macrostrat/ui-components";
import { useState } from "react";
import { MatchedEntityLink } from "#/integrations/xdd/extractions/match";
import { knowledgeGraphAPIURL } from "@macrostrat-web/settings";
import { Toaster } from "@blueprintjs/core";
import { fetchPGData } from "~/_utils";
import { AuthStatus, useAuth } from "@macrostrat/form-components";
import { MultiSelect } from "@blueprintjs/select"
import { MenuItem, TextArea, Popover } from "@blueprintjs/core";

/**
 * Get a single text window for feedback purposes
 */

export function Page() {
  const [paper_id, setPaperID] = useState<number | null>(null);
  const nextID = getNextID();
  console.log("Next ID:", nextID);

  return h(
    OverlaysProvider,
    h(ContentPage, [
      h("div.feedback-main", [
        h(PageBreadcrumbs),
        h(FlexRow, { alignItems: "center", justifyContent: "space-between" }, [
          h(FlexRow, [
            h("h1", "Feedback"),
            h.if(nextID)(Button, { 
              className: "next btn",
              onClick: () => {
                window.open(
                  `/integrations/xdd/feedback/${nextID}`,
                  "_self"
                ); 
              } 
            }, "Next"),
          ]),
          h.if(paper_id)(
            Button, 
            { 
              className: "paper btn",
              onClick: () => {
                window.open(
                  `/integrations/xdd/extractions/${paper_id}`,
                  "_self"
                ); 
              } 
            }, 
            "View papers extraction"
          ),
        ]),
        h(FlexRow, { className: "feedback-index", justifyContent: "space-between" }, [
          h(Feedback),
          h(AuthStatus)
        ]),
        h(ExtractionIndex, { setPaperID }),
      ]),
    ])
  );
}

function ExtractionIndex({setPaperID}) {
  const { routeParams } = usePageContext();
  const { sourceTextID } = routeParams;

  const models = useModelIndex();
  const entityTypes = useEntityTypeIndex();

  const data = usePostgresQuery("kg_context_entities", {
    subject: "source_text",
    predicate: sourceTextID,
  });

  if (data == null || models == null || entityTypes == null) {
    return h(Spinner);
  }

  console.log(data);

  setPaperID(data[0]?.paper_id || null);

  return h(
    ErrorBoundary,
    h(MultiFeedbackInterface, { data, models, entityTypes })
  );
}

function MultiFeedbackInterface({ data, models, entityTypes }) {
  const [ix, setIX] = useState(0);
  const currentData = data[ix];
  const count = data.length;

  return h("div.feedback-interface", [
    h.if(data.length > 1)([
      h(NonIdealState, {
        icon: "warning-sign",
        title: "Multiple model runs for feedback",
        description: `Showing entities from ${
          ix + 1
        } of ${count} model runs. Merging runs is not yet supported.`,
      }),
      h(Pagination, {
        count,
        page: ix,
        setPage: setIX,
        nextDisabled: ix >= count - 1,
      }),
    ]),
    h(FeedbackInterface, {
      data: currentData,
      models,
      entityTypes,
    }),
  ]);
}

const AppToaster = Toaster.create();

function FeedbackInterface({ data, models, entityTypes }) {
  const window = enhanceData(data, models, entityTypes);
  const { entities = [], paragraph_text, model } = window;
  const { user } = useAuth();

  console.log(window);
  console.log(Array.from(entityTypes.values()));

  return h(FeedbackComponent, {
    entities,
    text: paragraph_text,
    model,
    entityTypes,
    matchComponent: MatchedEntityLink,
    matchLinks: {
      lithology: "/lex/lithology",
      lith_att: "/lex/lith-atts",
      strat_name: "/lex/strat-names",
      concept: "/lex/strat-concepts",
    },
    lineHeight: 3,
    view: user === null,
    onSave: wrapWithToaster(
      async (tree) => {
        const data = prepareDataForServer(tree, window.source_text, [
          window.model_run,
        ]);
        await postDataToServer(data);
      },
      AppToaster,
      {
        success: "Model information saved",
        error: "Failed to save model information",
      }
    ),
  });
}

async function postDataToServer(data: ServerResults) {
  const response = await fetch(knowledgeGraphAPIURL + "/record_run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(response.statusText);
  }
}

function wrapWithToaster(
  fn: (...args: any[]) => Promise<void>,
  toaster: Toaster,
  messages: {
    success: string;
    error: string;
  }
) {
  return async (...args: any[]) => {
    try {
      await fn(...args);
      toaster.show({
        message: messages.success,
        intent: "success",
      });
    } catch (e) {
      console.error(e);
      toaster.show({
        message: messages.error + ": " + e.message,
        intent: "danger",
      });
    }
  };
}

interface ServerResults extends GraphData {
  sourceTextId: number;
  supersedesRunIds: number[];
}

function prepareDataForServer(
  tree: TreeData[],
  sourceTextID: number,
  supersedesRunIDs: number[] | null
): ServerResults {
  /** This function should be used before sending the data to the server */
  const { nodes, edges } = treeToGraph(tree);

  // Prepare match for server
  const normalizedNodes = nodes.map((d) => {
    return {
      ...d,
      match: normalizeMatch(d.match),
    };
  });

  return {
    nodes: normalizedNodes,
    edges,
    sourceTextId: sourceTextID,
    supersedesRunIds: supersedesRunIDs ?? [],
  };
}

// We will extend this in the future, probably,
// to handle ages and other things
type MatchInfo = { type: "lith" | "lith_att" | "strat_name"; id: number };

function normalizeMatch(match: any): MatchInfo | null {
  if (match == null) return null;
  if (match.lith_id) return { type: "lith", id: match.lith_id };
  if (match.lith_att_id) {
    return { type: "lith_att", id: match.lith_att_id };
  }
  if (match.strat_name_id) {
    return { type: "strat_name", id: match.strat_name_id };
  }
  return null;
}

// function FeedbackDevTool() {
//   const entities = useStore((state) => state.entities);
//   if (entities == null)
//     return h(NonIdealState, { icon: h(Spinner), title: "Loading..." });
//
//   return h(JSONView, { data: entities, showRoot: false, keyPath: 0 });
// }
//
// FeedbackDevTool.title = "Feedback";
//
// export const devTools = [FeedbackDevTool];

function getNextID() {
  const currentID = usePageContext().urlPathname.split("/").pop();
  const [nextID, setNextID] = useState<number | null>(null);

  const res = fetchPGData(
    "/kg_source_text",
    {
      order: "id",
      limit: 1,
      id: "gt." + currentID
    }
  ).then((data) => {
    setNextID(data?.[0]?.id || 18131); // Default to 18131 if no next ID found
  });

  return nextID;
}

function Feedback() {  
  const [selectedFeedbackType, setSelectedFeedbackType] = useState([]);
  const [customFeedback, setCustomFeedback] = useState("");

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
  ])
}
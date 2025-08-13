import h from "./+Page.client.module.sass";
import { ContentPage, FullscreenPage } from "~/layouts";
import { getPGData, PageBreadcrumbs } from "~/components";
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
} from "../../../extractions/data-service";
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

  return h(
    OverlaysProvider,
    h(ContentPage, [
      h("div.feedback-main", [
        h(PageBreadcrumbs, { title: "Previous Feedback" }),
        h(FlexRow, { alignItems: "center", justifyContent: "space-between" }, [
          h("h1", "Previous Feedback"),
          h('div.buttons', [
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

  const data = getPGData("/kg_context_entities", {
    source_text: "eq." + sourceTextID,
    version_id: "is.null"
  });

  if (data == null || models == null || entityTypes == null) {
    return h(Spinner);
  }

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

  const autoSelect = window.location.href.split('autoselect=')[1]?.split(",");

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
        currentPage: ix,
        setPage: setIX,
        nextDisabled: ix >= count - 1,
      }),
    ]),
    h(FeedbackInterface, {
      data: currentData,
      models,
      entityTypes,
      autoSelect
    }),
  ]);
}

function FeedbackInterface({ data, models, entityTypes, autoSelect }) {
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
      lithology: "/lex/lithologies",
      lith_att: "/lex/lith-atts",
      strat_name: "/lex/strat-names",
      concept: "/lex/strat-concepts",
    },
    lineHeight: 3,
    view: true,
    autoSelect,
  });
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
import React, { useState, useEffect } from "react";
import { hyperStyled } from "@macrostrat/hyper";
import {
  QueryList,
  ItemRenderer,
  IQueryListRendererProps,
  ItemPredicate,
} from "@blueprintjs/select";
import pg from "~/db";
import { Button, Callout, InputGroup, MenuItem, Tag } from "@blueprintjs/core";
import styles from "./strat-name.module.scss";
import {
  PostgrestFilterBuilder,
  PostgrestQueryBuilder,
} from "@supabase/postgrest-js";
import { StratNameI } from "~/types";
import { Tooltip2 } from "@blueprintjs/popover2";

const h = hyperStyled(styles);

const StrtaNameQueryList = QueryList.ofType<StratNameI>();

const itemPredicate: ItemPredicate<StratNameI> = (query, item, index) => {
  const { strat_name } = item;

  return strat_name?.toLowerCase().indexOf(query.toLowerCase()) >= 0;
};

const SourceTag = ({ source }: { source: string | undefined }) => {
  return h.if(typeof source !== "undefined")(
    Tooltip2,
    {
      content: source ?? "",
      className: "source-text",
      placement: "top",
      minimal: true,
    },
    [
      h.if(source === "unrelated")(Tag, { minimal: true, intent: "danger" }, [
        h("b", ["may be unrelated"]),
      ]),
      h.if(source !== "unrelated")(Tag, { minimal: true }, [h("i", [source])]),
    ]
  );
};

const AuthorTag = ({
  author,
  concept_id,
}: {
  author: string | null;
  concept_id: number | null;
}) => {
  return h(React.Fragment, [
    h("div.author-tag", [
      h.if(author != null)(Tag, { intent: "success", minimal: true }, [author]),
    ]),
    h("div.author-tag", [
      h.if(!concept_id)(Tag, { intent: "warning", minimal: true }, "Unlinked"),
    ]),
  ]);
};

const StratNameListItem = (props: StratNameI) => {
  const { strat_name, author, rank, parent, source, concept_id } = props;

  const parentText = parent ? `${parent}` : "";

  return h("div", [
    h("div.flex-between", [
      h("div.name-text", [
        h("b", [`${strat_name} ${rank}`]),
        h("i.parent-name", [`${parentText}`]),
      ]),
      h("div.author-source-tag", [
        h(SourceTag, { source }),
        h(AuthorTag, { author, concept_id }),
      ]),
    ]),
  ]);
};

const StratNameItemRenderer: ItemRenderer<StratNameI> = (
  item: StratNameI,
  { handleClick, index, modifiers }
) => {
  return h(MenuItem, {
    key: index,
    text: h(StratNameListItem, { ...item }),
    onClick: handleClick,
    active: modifiers.active,
  });
};

const StratNameNewRenderer = (props: { onClickCreateNew: () => void }) => {
  return h(Callout, { intent: "warning", title: "No results" }, [
    `No matching name in Macrostrat lexicon. `,
    "This could be for a few reasons:",
    h("ul", [
      h("li", [
        "The search algorithm prioritizes based on location. Ensure this column's location is set correctly.",
      ]),
      h("li", [
        "The name you're searching for may be in as a different spelling,",
      ]),
      h("li", ["The name may just not exist in Macrostrat's lexicon."]),
    ]),
    h(
      Button,
      {
        intent: "warning",
        style: { marginTop: "5px" },
        onClick: props.onClickCreateNew,
      },
      ["Create new"]
    ),
  ]);
};

const StratNameQueryListRenderer = (
  props: IQueryListRendererProps<StratNameI>
) => {
  const { itemList, handleKeyDown, handleKeyUp, ...listProps } = props;
  return h(
    "div.lith-query-list-renderer",
    { onKeyDown: handleKeyDown, onKeyUp: handleKeyUp },
    [
      h(InputGroup, {
        ["aria-autocomplete"]: "list",
        leftIcon: "search",
        placeholder: "Search for a stratigraphic name",
        onChange: listProps.handleQueryChange,
        value: listProps.query,
      }),
      itemList,
    ]
  );
};

const getStratNames = async (
  query: string,
  setNames: (e: StratNameI[]) => void,
  col_id?: number
) => {
  let baseQuery:
    | PostgrestFilterBuilder<StratNameI>
    | PostgrestQueryBuilder<StratNameI> = pg.from("strat_names");
  if (typeof col_id !== "undefined") {
    baseQuery = pg.rpc("get_strat_names_col_priority", { _col_id: col_id });
  }
  if (query.length > 2) {
    const { data, error } = await baseQuery
      .select()
      .ilike("strat_name", `%${query}%`)
      .limit(50);
    setNames(data ?? []);
  } else {
    const { data, error } = await baseQuery.select().limit(50);
    setNames(data ?? []);
  }
};

interface StratNameSelectProps {
  onItemSelect: (l: StratNameI) => void;
  onClickCreateNew: () => void;
  col_id: number;
}

function StratNameSelect(props: StratNameSelectProps) {
  const [names, setNames] = useState<StratNameI[]>([]);
  const onQueryChange = (i: string) => {
    getStratNames(i, (e: StratNameI[]) => setNames(e), props.col_id);
  };

  useEffect(() => {
    onQueryChange("");
  }, []);

  return h(StrtaNameQueryList, {
    itemRenderer: StratNameItemRenderer,
    itemPredicate,
    onItemSelect: props.onItemSelect,
    items: names,
    renderer: StratNameQueryListRenderer,
    resetOnSelect: false,
    noResults: h(StratNameNewRenderer, {
      onClickCreateNew: props.onClickCreateNew,
    }),
    menuProps: {
      style: {
        maxWidth: "100%",
        margin: "0 10px",
        maxHeight: "400px !important",
      },
    },
    onQueryChange,
  });
}

export { StratNameSelect, StratNameListItem };

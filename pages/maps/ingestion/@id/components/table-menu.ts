import { Button, Menu, InputGroup } from "@blueprintjs/core";
import React from "react";
import { useDebouncedCallback } from "use-debounce";

// @ts-ignore
import hyper from "@macrostrat/hyper";

import { OperatorQueryParameter, ColumnOperatorOption } from "../table";

import "~/styles/blueprint-select";
import styles from "../edit-table.module.sass";
import { Filter } from "../utils/filter";

const h = hyper.styled(styles);

const validExpressions: ColumnOperatorOption[] = [
  { key: "na", value: "", verbose: "None" },
  { key: "eq", value: "=", verbose: "Equals" },
  { key: "lt", value: "<", verbose: "Is less than" },
  { key: "le", value: "<=", verbose: "Is less than or equal to" },
  { key: "gt", value: ">", verbose: "Is greater than" },
  { key: "ge", value: ">=", verbose: "Is greater than or equal to" },
  { key: "ne", value: "<>", verbose: "Is not equal to" },
  {
    key: "is_distinct_from",
    value: "IS DISTINCT FROM",
    verbose: "Is distinct from",
  },
  {
    key: "is_not_distinct_from",
    value: "IS NOT DISTINCT FROM",
    verbose: "Is not distinct from",
  },
  { key: "like", value: "LIKE", verbose: "Like" },
  { key: "is", value: "IS", verbose: "Is", placeholder: "true | false | null" },
  { key: "in", value: "IN", verbose: "In", placeholder: "1,2,3" },
];

interface TableMenuProps {
  columnName: string;
  onFilterChange: (query: OperatorQueryParameter) => void;
  filter: Filter;
  onGroupChange: (group: string | undefined) => void;
  group: string | undefined;
  onHide: () => void;
  hidden: boolean;
}

export const TableMenu = ({
  columnName,
  onFilterChange,
  filter: _filter,
  onGroupChange,
  group,
  onHide,
}: TableMenuProps) => {
  const [inputPlaceholder, setInputPlaceholder] = React.useState<string>("");

  const filter = _filter ?? new Filter(columnName, "eq", null);

  // Create a debounced version of the text state
  const [inputValue, setInputValue] = React.useState<string>(filter.value);
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ operator: filter.operator, value: e.target.value });
  };
  const debouncedInputChange = useDebouncedCallback(onInputChange, 1000);

  // Set the expression current value from the parent filter
  const selectedExpression = validExpressions.find(
    (expression) => expression.key === filter.operator
  );

  // Set if this group is active
  const groupActive: boolean = group === columnName;

  return h(Menu, {}, [
    h("div.filter-container", {}, [
      h("div.filter-header", {}, ["Filter"]),
      h("div.filter-select", {}, [
        h(
          "select",
          {
            style: {
              padding: "6px",
              border: "#d7d8d9 1px solid",
              borderBottom: "none",
              borderRadius: "2px 2px 0 0",
            },
            value: filter.operator,
            onChange: (e) => {
              if (e.target.value === "na") {
                onFilterChange({ operator: undefined, value: filter.value });
              } else {
                onFilterChange({
                  operator: e.target.value,
                  value: filter.value,
                });
              }
            },
          },
          [
            ...validExpressions.map((expression) => {
              return h(
                "option",
                {
                  value: expression.key,
                },
                [expression.verbose]
              );
            }),
          ]
        ),
        h("div.filter-input", {}, [
          h(
            InputGroup,
            {
              value: inputValue || "",
              className: "update-input-group",
              placeholder: inputPlaceholder,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                setInputValue(e.target.value);
                debouncedInputChange(e);
              },
              onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
                // Make sure this value gets published if the menu is hidden be debounce
                onInputChange(e);
              },
            },
            []
          ),
        ]),
      ]),
      h("div.filter-select", {}, [
        h(
          Button,
          {
            rightIcon: groupActive ? "tick" : "disable",
            alignText: "left",
            intent: groupActive ? "success" : "warning",
            text: groupActive ? "Grouped By" : "Group By",
            fill: true,
            onClick: () => {
              onGroupChange(
                group == filter.column_name ? undefined : filter.column_name
              );
            },
          },
          []
        ),
      ]),
      ,
      h("div.filter-select", {}, [
        h(
          Button,
          {
            rightIcon: "disable",
            alignText: "left",
            intent: "warning",
            text: "Hide",
            fill: true,
            onClick: () => {
              onHide();
            },
          },
          []
        ),
      ]),
    ]),
  ]);
};

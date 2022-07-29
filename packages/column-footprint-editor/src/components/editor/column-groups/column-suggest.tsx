import { Suggest } from "@blueprintjs/select";
import { Icon, MenuItem } from "@blueprintjs/core";
import React, { useState, useEffect } from "react";

export function ColumnSuggest(props) {
  const {
    items,
    onChange,
    onFilter = () => {},
    initialItem,
    createNew = false,
    ...rest
  } = props;
  const [selectedItem, setSelectedItem] = useState({});
  const [query, setQuery] = useState("");

  let itemz = [...items];

  let initialQuery = initialItem.col_group_name;
  useEffect(() => {
    if (initialQuery && initialQuery != "") {
      setQuery(initialQuery);
      itemz = [...itemz];
      setSelectedItem(initialQuery);
    }
  }, [initialQuery]);

  const itemRenderer = (item, itemProps) => {
    const isSelected = item == selectedItem;
    const { id, col_group, col_group_name } = item;
    return (
      <MenuItem
        key={id}
        labelElement={col_group}
        intent={isSelected ? "primary" : null}
        text={col_group_name}
        onClick={itemProps.handleClick}
        active={isSelected ? "active" : itemProps.modifiers.active}
      />
    );
  };

  const onQueryChange = (query) => {
    onFilter(query);
  };

  const itemPredicate = (query, item) => {
    const { id, col_group_name } = item;

    return col_group_name.toLowerCase().indexOf(query.toLowerCase()) >= 0;
  };

  const onItemSelect = (item) => {
    onChange(item);
    setSelectedItem(item.col_group_name);
  };

  const createNewItemRenderer = (query, itemProps) => {
    return (
      <MenuItem
        icon="add"
        text={`Create ${query}`}
        onClick={() => onChange(query)}
        intent="success"
      />
    );
  };

  const createNewItemFromQuery = (query) => {
    return query;
  };

  return (
    <div>
      <Suggest
        inputValueRenderer={(item) => item.col_group_name}
        items={itemz}
        popoverProps={{
          minimal: true,
          popoverClassName: "my-suggest",
        }}
        inputProps={{ fill: true, style: { minWidth: "350px" } }}
        query={query}
        onItemSelect={onItemSelect}
        onQueryChange={onQueryChange}
        itemRenderer={itemRenderer}
        itemPredicate={itemPredicate}
        selectedItem
        createNewItemRenderer={createNew ? createNewItemRenderer : null}
        createNewItemFromQuery={createNew ? createNewItemFromQuery : null}
      />
    </div>
  );
}

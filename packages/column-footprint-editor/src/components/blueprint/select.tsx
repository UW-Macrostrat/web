import { Suggest } from "@blueprintjs/select";
import { Icon, MenuItem } from "@blueprintjs/core";
import React, { useState, useEffect } from "react";

export function MySuggest(props) {
  const {
    items,
    onChange,
    onFilter = () => {},
    initialQuery,
    createNew = true,
    ...rest
  } = props;
  const [selectedItem, setSelectedItem] = useState({});
  const [query, setQuery] = useState("");

  let itemz = [...items];

  useEffect(() => {
    if (initialQuery && initialQuery != "") {
      setQuery(initialQuery);
      itemz = [...itemz, { text: initialQuery }];
      setSelectedItem(initialQuery);
    }
  }, [initialQuery]);

  const itemRenderer = (item, itemProps) => {
    const isSelected = item == selectedItem;
    const { id, text } = item;
    return (
      <MenuItem
        key={id}
        labelElement={isSelected ? <Icon icon="tick" /> : null}
        intent={isSelected ? "primary" : null}
        text={text}
        onClick={itemProps.handleClick}
        active={isSelected ? "active" : itemProps.modifiers.active}
      />
    );
  };

  const onQueryChange = (query) => {
    onFilter(query);
  };

  const itemPredicate = (query, item) => {
    const { id, text } = item;

    return text.toLowerCase().indexOf(query.toLowerCase()) >= 0;
  };

  const onItemSelect = (item) => {
    onChange(item);
    setSelectedItem(item.text);
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
        inputValueRenderer={(item) => item.text}
        items={itemz}
        popoverProps={{
          minimal: true,
          popoverClassName: "my-suggest",
        }}
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

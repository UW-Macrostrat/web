import React, { useContext } from "react";
import h from "@macrostrat/hyper";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import RemoveCircleOutlineIcon from "@material-ui/icons/RemoveCircleOutline";
import { CloseableCard } from "./CloseableCard";
import { useDispatch } from "react-redux";
import { useAppActions, useFilterState } from "../reducers";

function Filter({ filter }) {
  const dispatch = useDispatch();
  const remove = () => dispatch({ type: "remove-filter", filter });
  return (
    <ListItem>
      <ListItemText primary={filter.name} />
      <ListItemSecondaryAction>
        <IconButton edge="end" aria-label="delete" onClick={remove}>
          <RemoveCircleOutlineIcon />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );
}

function Filters(props) {
  const runAction = useAppActions();
  const { filters, filtersOpen } = useFilterState();

  return (
    <CloseableCard
      isOpen={filtersOpen}
      onClose={() => runAction({ type: "toggle-filters" })}
      title="Filters"
    >
      <List>
        <ListItem className={filters.length > 0 ? "hidden" : ""}>
          <ListItemText primary="No filters applied" />
        </ListItem>
        {filters.map((filter, key) => h(Filter, { key, filter }))}
      </List>
    </CloseableCard>
  );
}

export default Filters;

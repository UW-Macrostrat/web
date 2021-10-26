import React, { Component } from "react";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import RemoveCircleOutlineIcon from "@material-ui/icons/RemoveCircleOutline";
import { CloseableCard } from "./CloseableCard";
import { connect } from "react-redux";
import { toggleFilters, removeFilter } from "../actions";

class Filters extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    const { filtersOpen, toggleFilters } = this.props;

    return (
      <CloseableCard
        isOpen={filtersOpen}
        onClose={toggleFilters}
        title="Filters"
      >
        <List>
          <ListItem className={this.props.filters.length > 0 ? "hidden" : ""}>
            <ListItemText primary="No filters applied" />
          </ListItem>
          {this.props.filters.map((d, i) => {
            return (
              <ListItem key={i}>
                <ListItemText primary={d.name} />
                <ListItemSecondaryAction
                  onClick={() => {
                    this.props.removeFilter(d);
                  }}
                >
                  <IconButton color="secondary" aria-label="remove">
                    <RemoveCircleOutlineIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      </CloseableCard>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    filtersOpen: state.update.filtersOpen,
    filters: state.update.filters,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    toggleFilters: () => {
      dispatch(toggleFilters());
    },
    removeFilter: (f) => {
      dispatch(removeFilter(f));
    },
  };
};

const FiltersContainer = connect(mapStateToProps, mapDispatchToProps)(Filters);

export default FiltersContainer;

import React, { Component } from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import RemoveCircleOutlineIcon from "@material-ui/icons/RemoveCircleOutline";
import CloseIcon from "@material-ui/icons/Close";

class Filters extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    const { filtersOpen, toggleFilters } = this.props;

    return (
      <Dialog
        open={filtersOpen}
        onBackdropClick={toggleFilters}
        aria-labelledby="filters"
      >
        <DialogTitle id="filter-title">
          Filters
          <IconButton color="default" aria-label="Menu" onClick={toggleFilters}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <div>
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
        </div>
      </Dialog>
    );
  }
}

export default Filters;

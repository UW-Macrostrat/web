import React, { Component } from 'react'
import Dialog, { DialogTitle } from 'material-ui/Dialog'
import IconButton from 'material-ui/IconButton'
import List, { ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction } from 'material-ui/List'
import RemoveCircleOutlineIcon from 'material-ui-icons/RemoveCircleOutline'
import CloseIcon from 'material-ui-icons/Close'

class Filters extends Component {
  constructor(props) {
    super(props)
  }
  render() {
    const { filtersOpen, toggleFilters } = this.props

    return (
      <Dialog
        open={filtersOpen}
        onBackdropClick={toggleFilters}
        aria-labelledby="filters">
        <DialogTitle id="filter-title">
          Filters

          <IconButton color="default" aria-label="Menu" onClick={toggleFilters}>
            <CloseIcon/>
          </IconButton>

        </DialogTitle>
        <div>
          <List>
            <ListItem>
              <ListItemText primary="Test filter"/>
              <ListItemSecondaryAction>
                <IconButton color="default" aria-label="remove" >
                  <RemoveCircleOutlineIcon/>
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </div>
      </Dialog>
    )
  }
}

export default Filters

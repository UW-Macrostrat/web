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
            <ListItem className={this.props.filters.length > 0 ? 'hidden' : ''}>
              <ListItemText primary='No filters applied'/>
            </ListItem>
            {this.props.filters.map((d,i) => {
              return <ListItem key={i}>
                <ListItemText primary={d.name}/>
                <ListItemSecondaryAction onClick={() => { this.props.removeFilter(d) }}>
                  <IconButton color="accent" aria-label="remove" >
                    <RemoveCircleOutlineIcon/>
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            })}
          </List>
        </div>
      </Dialog>
    )
  }
}

export default Filters

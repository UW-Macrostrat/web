import React, { Component } from 'react'
import PropTypes from 'prop-types'
import TextField from 'material-ui/TextField'
import Grid from 'material-ui/Grid'
import Toolbar from 'material-ui/Toolbar'
import IconButton from 'material-ui/IconButton'
import MenuIcon from 'material-ui-icons/Menu'
import WarningIcon from 'material-ui-icons/Warning'
import Paper from 'material-ui/Paper'
import ListSubheader from 'material-ui/List/ListSubheader'
import List, { ListItem, ListItemIcon, ListItemText } from 'material-ui/List'

import Collapse from 'material-ui/transitions/Collapse'

const categoryTitles = {
  'lithology': 'Lithologies',
  'interval': 'Time Intervals',
  'place': 'Places (via Mapbox)',
  'strat_name': 'Stratigraphic Names',
}
class Searchbar extends Component {
  constructor(props) {
    super(props)
    this.state = {
      inputFocused: false,
      searchTerm: ''
    }
    this.gainInputFocus = this.gainInputFocus.bind(this)
    this.loseInputFocus = this.loseInputFocus.bind(this)
    this.handleSearchInput = this.handleSearchInput.bind(this)
    this.addFilter = this.addFilter.bind(this)
  }

  gainInputFocus() {
    this.setState({
      inputFocused: true
    })
  }
  loseInputFocus() {
    // A slight timeout is required so that click actions can occur
    setTimeout(() => {
      this.setState({
        inputFocused: false
      })
    }, 100)
  }
  handleSearchInput(event) {
    this.setState({ searchTerm: event.target.value })
    if (event.target.value.length <= 2) {
      return
    }
    this.props.doSearch(event.target.value)
  }
  addFilter(f) {
    this.setState({
      searchTerm: ''
    })
    this.props.addFilter(f)
  }

  render() {
    const { toggleMenu, toggleFilters } = this.props
    let resultCategories = new Set(this.props.searchResults.map(d => { return d.category }))
    resultCategories = [...resultCategories]

    let categoryResults = resultCategories.map((cat) => {
      let thisCat = this.props.searchResults.filter(f => {
        if (f.category === cat) return f
      })
      return thisCat.map((item, h) => {
        return <ListItem key={h} button onClick={() => { this.addFilter(item) }}>
          <ListItemText primary={item.name}/>
        </ListItem>
      })
    })

    let searchResults = resultCategories.map((cat, i) => {
      return <div key={`subheader-${i}`}>
          <ListSubheader>{categoryTitles[cat]}</ListSubheader>
          {categoryResults[i]}
        </div>
    })

    return (
      <div className="searchbar-holder">
        <Grid container>
          <Grid item xs={12} sm={7} md={6} lg={4} xl={3}>
            <Paper>
              <Toolbar>
                  <IconButton color="default" aria-label="Menu" onClick={toggleMenu}>
                    <MenuIcon />
                  </IconButton>
                  <input
                    className="search-input"
                    type="text"
                    placeholder="Search Macrostrat"
                    onFocus={this.gainInputFocus}
                    onBlur={this.loseInputFocus}
                    onChange={this.handleSearchInput}
                    value={this.state.searchTerm}
                  />
                <IconButton color={this.props.filters.length != 0 ? "accent" : "default"} aria-label="filter" onClick={toggleFilters}>
                    <WarningIcon />
                  </IconButton>
              </Toolbar>
              <Collapse in={this.state.inputFocused} timeout="auto" unmountOnExit>
                <div className="search-results">
                  <List className={this.state.searchTerm.length != 0 ? 'hidden' : ''} dense={true}>
                    <ListItem>
                      <ListItemText primary="Available categories:" />
                    </ListItem>
                    <ListItem>
                      <ListItemText inset primary="Time intervals" />
                    </ListItem>
                    <ListItem>
                      <ListItemText inset primary="Lithologies" />
                    </ListItem>
                    <ListItem>
                      <ListItemText inset primary="Stratigraphic Names" />
                    </ListItem>
                    <ListItem>
                      <ListItemText inset primary="Places" />
                    </ListItem>
                  </List>
                  <List className={this.state.searchTerm.length < 3 ? 'hidden' : ''}>
                    {this.props.searchResults && this.props.searchResults.length ?
                      searchResults
                      : ''
                    }
                  </List>
                </div>
              </Collapse>
            </Paper>
          </Grid>
        </Grid>

      </div>
    )
  }
}

// Searchbar.propTypes = {
//   onClick: PropTypes.func.isRequired,
//   msg: PropTypes.string.isRequired,
//   clicks: PropTypes.number.isRequired
// }

export default Searchbar

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import TextField from 'material-ui/TextField'
import Grid from 'material-ui/Grid'
import Toolbar from 'material-ui/Toolbar'
import IconButton from 'material-ui/IconButton'
import MenuIcon from 'material-ui-icons/Menu'
import WarningIcon from 'material-ui-icons/Warning'
import Paper from 'material-ui/Paper'

import Collapse from 'material-ui/transitions/Collapse'

class Searchbar extends Component {
  constructor(props) {
    super(props)
    this.state = {
      inputFocused: false
    }
    this.gainInputFocus = this.gainInputFocus.bind(this)
    this.loseInputFocus = this.loseInputFocus.bind(this)
  }

  gainInputFocus() {
    this.setState({
      inputFocused: true
    })
  }
  loseInputFocus() {
    this.setState({
      inputFocused: false
    })
  }

  render() {
    const { toggleMenu, toggleFilters } = this.props

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
                  />
                  <IconButton color="default" aria-label="filter" onClick={toggleFilters}>
                    <WarningIcon />
                  </IconButton>
              </Toolbar>
              <Collapse in={this.state.inputFocused} timeout="auto" unmountOnExit>
                <div className="search-results">
                  <span className="search-hint">Try searching for a time interval or place</span>
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

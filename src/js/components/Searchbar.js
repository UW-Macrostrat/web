import React, { Component } from 'react'
import PropTypes from 'prop-types'
import TextField from 'material-ui/TextField'
import Grid from 'material-ui/Grid'
import Toolbar from 'material-ui/Toolbar'
import IconButton from 'material-ui/IconButton'
import MenuIcon from 'material-ui-icons/Menu'
import WarningIcon from 'material-ui-icons/Warning'
import Paper from 'material-ui/Paper';

class Searchbar extends Component {
  constructor(props) {
    super(props)
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
                <input className="search-input" type="text" placeholder="Search Macrostrat"/>
                <IconButton color="default" aria-label="filter" onClick={toggleFilters}>
                  <WarningIcon />
                </IconButton>
            </Toolbar>
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

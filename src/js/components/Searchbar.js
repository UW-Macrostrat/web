import React, { Component } from 'react'
import {Collapse, Navbar, Alignment,
        Button, Intent, InputGroup} from '@blueprintjs/core'
import h from 'react-hyperscript'
import classNames from 'classnames'

const categoryTitles = {
  'lithology': 'Lithologies',
  'interval': 'Time Intervals',
  'place': 'Places (via Mapbox)',
  'strat_name': 'Stratigraphic Names',
  'environ': 'Environments (columns only)',
}

const sortOrder = {
  'interval': 1,
  'lithology': 2,
  'strat_name': 3,
  'environ': 4,
  'place': 5
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
  //  console.log('focus')
    this.setState({
      inputFocused: true
    })
  }
  loseInputFocus() {
  //  console.log('lose focus')
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
  addFilter(f) {d
    this.setState({
      searchTerm: ''
    })
    this.props.addFilter(f)
  }

  render() {
    const { toggleMenu, toggleFilters } = this.props
    let resultCategories = new Set(this.props.searchResults.map(d => { return d.category }))
    // Force the results into a particular order
    resultCategories = [...resultCategories].sort((a, b) => {
      return sortOrder[a] - sortOrder[b]
    })

    let categoryResults = resultCategories.map((cat) => {
      let thisCat = this.props.searchResults.filter(f => {
        if (f.category === cat) return f
      })
      return thisCat.map((item, h) => {
        return (<li key={h} onClick={() => { this.addFilter(item) }}>{item.name}</li>)
      })
    })

    let searchResults = resultCategories.map((cat, i) => {
      return (
        <div key={`subheader-${i}`}>
          <h3 className='searchresult-header'>{categoryTitles[cat]}</h3>
          <ul>{categoryResults[i]}</ul>
        </div>
      )
    })

    // This is what media queries in CSS are for, we should do that instead...
    let holderStyle = {
      margin: ((window.innerWidth < 850) && this.state.inputFocused) ? 0 : '20px'
    }

    let searchResultClasses = classNames(
      {hidden: this.state.searchTerm.length < 3},
      'search-results'
    )

    let filterButton = (
        <Button
          disabled={this.props.filters.length == 0}
          icon="filter"
          minimal
          aria-label="Filter"
          intent={Intent.PRIMARY}
          onClick={this.toggleFilters}
        />
    )

    return (
      <div className="searchbar-holder" style={holderStyle}>
        <Navbar className="searchbar">
          <Navbar.Group align={Alignment.LEFT}>
            <Navbar.Heading>Macrostrat</Navbar.Heading>
            <Button icon="layers"
              aria-label="Layers" onClick={toggleMenu} minimal />
          </Navbar.Group>
          <Navbar.Group align={Alignment.RIGHT}>
             <InputGroup
                large
                leftIcon="search"
                onChange={this.handleSearchInput}
                onFocus={this.gainInputFocus}
                onBlur={this.loseInputFocus}
                placeholder="Search and filter..."
                rightElement={filterButton}
                value={this.state.searchTerm} />
          </Navbar.Group>
        </Navbar>
        <Collapse isOpen={this.state.inputFocused}>
          <div className={classNames({hidden: this.state.searchTerm.length != 0}, 'search-results')}>
            <h5>Available categories:</h5>
            <ul>
              <li>Time intervals</li>
              <li>Lithologies</li>
              <li>Stratigraphic Names</li>
              <li>Environments (columns only)</li>
              <li>Places</li>
            </ul>
          </div>
          <div className={searchResultClasses}>
            {this.props.searchResults && this.props.searchResults.length ?
              searchResults
              : '' }
          </div>
        </Collapse>
      </div>
    )
  }
}

export default Searchbar

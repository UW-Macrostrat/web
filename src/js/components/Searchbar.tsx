import React, { Component } from "react";
import {
  Collapse,
  Navbar,
  Alignment,
  Button,
  Intent,
  InputGroup,
  Card,
} from "@blueprintjs/core";
import h from "react-hyperscript";
import classNames from "classnames";

const categoryTitles = {
  lithology: "Lithologies",
  interval: "Time Intervals",
  place: "Places (via Mapbox)",
  strat_name: "Stratigraphic Names",
  environ: "Environments (columns only)",
};

const sortOrder = {
  interval: 1,
  lithology: 2,
  strat_name: 3,
  environ: 4,
  place: 5,
};
class Searchbar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      inputFocused: false,
      searchTerm: "",
    };
    this.gainInputFocus = this.gainInputFocus.bind(this);
    this.loseInputFocus = this.loseInputFocus.bind(this);
    this.handleSearchInput = this.handleSearchInput.bind(this);
    this.addFilter = this.addFilter.bind(this);
  }

  gainInputFocus() {
    //  console.log('focus')
    this.setState({
      inputFocused: true,
    });
  }
  loseInputFocus() {
    //  console.log('lose focus')
    // A slight timeout is required so that click actions can occur
    setTimeout(() => {
      this.setState({
        inputFocused: false,
      });
    }, 100);
  }
  handleSearchInput(event) {
    this.setState({ searchTerm: event.target.value });
    if (event.target.value.length <= 2) {
      return;
    }
    this.props.doSearch(event.target.value);
  }
  addFilter(f) {
    this.setState({
      searchTerm: "",
    });
    this.props.addFilter(f);
  }

  render() {
    const { toggleMenu, toggleFilters } = this.props;
    const { addFilter } = this;
    let resultCategories = new Set(
      this.props.searchResults.map((d) => {
        return d.category;
      })
    );
    // Force the results into a particular order
    resultCategories = [...resultCategories].sort((a, b) => {
      return sortOrder[a] - sortOrder[b];
    });

    let categoryResults = resultCategories.map((cat) => {
      let thisCat = this.props.searchResults.filter((f) => {
        if (f.category === cat) return f;
      });
      return thisCat.map((item, h) => {
        return (
          <li
            key={h}
            onClick={() => {
              addFilter(item);
            }}
          >
            {item.name}
          </li>
        );
      });
    });

    let searchResults = resultCategories.map((cat, i) => {
      return (
        <div key={`subheader-${i}`}>
          <h3 className="searchresult-header">{categoryTitles[cat]}</h3>
          <ul>{categoryResults[i]}</ul>
        </div>
      );
    });

    let searchResultClasses = classNames(
      { hidden: this.state.searchTerm.length < 3 },
      "search-results"
    );

    let filterButton = (
      <Button
        disabled={false}
        icon="filter"
        minimal
        aria-label="Filter"
        intent={Intent.PRIMARY}
        onClick={toggleFilters}
      />
    );

    return (
      <div className="searchbar-holder">
        <div className="navbar-holder">
          <Navbar className="searchbar panel">
            <InputGroup
              large={true}
              //leftIcon="search"
              onChange={this.handleSearchInput}
              onFocus={this.gainInputFocus}
              onBlur={this.loseInputFocus}
              placeholder="Search Macrostrat..."
              rightElement={filterButton}
              value={this.state.searchTerm}
            />
            <Button
              icon="menu"
              aria-label="Menu"
              large
              onClick={toggleMenu}
              minimal
            />
          </Navbar>
        </div>
        <Collapse
          isOpen={this.state.inputFocused}
          className="search-results-container panel"
        >
          <Card
            className={classNames(
              { hidden: this.state.searchTerm.length != 0 },
              "search-guidance"
            )}
          >
            <h5>Available categories:</h5>
            <ul>
              <li>Time intervals</li>
              <li>Lithologies</li>
              <li>Stratigraphic Names</li>
              <li>Environments (columns only)</li>
              <li>Places</li>
            </ul>
          </Card>
          <Card className={searchResultClasses}>
            {this.props.searchResults && this.props.searchResults.length
              ? searchResults
              : ""}
          </Card>
        </Collapse>
      </div>
    );
  }
}

export default Searchbar;

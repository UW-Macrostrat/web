import React from 'react';
import AutocompleteResultItem from './AutocompleteResultItem';
import xhr from 'xhr';

var Autocomplete = React.createClass({
  cache: {},

  getInitialState: function() {
      return {
        searchTerm: '',
        results: this.resetResults(),
        selectedIndex: 0,
        selectedItem: {},
        tResults: 0,
        showSuggestions: false
      }
  },

  getDefaultProps: function() {
    return {
      limit: 5,
      minLength: 2,
      categoryLookup: {
        'cols': 'Columns',
        'intervals': 'Intervals',
        'strat_names': 'Stragrigraphic Names',
        'liths': 'Lithologies'
      }
    }
  },

  resetResults: function() {
    return {
      strat_names: [],
      cols: [],
      intervals: [],
      liths: []
    }
  },

  updateResults: function(data) {
    // Set the data
    this.setState({results: data});

    // Record the total number of search results returned
    this.setState({tResults: Object.keys(data).map(function(category) {
      return data[category];
    }).map(function(d) {
      return d.length;
    }).reduce(function(a, b) {
      return a + b;
    }, 0)});
  },

  fetch: function(query) {
    xhr({
      uri: `http://localhost:5000/api/v2/defs/autocomplete?query=${query}`
    }, function(error, response, body) {
      var response = JSON.parse(body);

      var keys = Object.keys(response.success.data);

      // Trim each category of results to our limit
      for (var i = 0; i < keys.length; i++) {
        response.success.data[keys[i]] = response.success.data[keys[i]].slice(0, (this.props.limit + 1));
      }

      /*
      if (response.data.success.data['strat_names']) {
        var suggestion = response.data.success.data['strat_names'][0].name;
        this.setState({searchTerm: suggestion})
        React.findDOMNode(this.refs.corbin)
          .setSelectionRange(query.length, suggestion.length);
      }
      */

      // Cache the results so we don't have to make an HTTP request
      // next time we see the same query
      this.cache[query] = response.success.data;

      // Update the current result list
      this.updateResults(response.success.data);
    }.bind(this));
  },

  fulfillRequest(query) {
    // Check if the query is long enough to fulfill
    if (query.length >= this.props.minLength) {
      // If it's cached, use the suggestions from there
      if (this.cache[query]) {
        this.updateResults(this.cache[query]);
      // Otherwise request them from the API
      } else {
        this.fetch(query);
      }
    } else {
      this.updateResults(this.resetResults());
    }
  },

  update: function(event) {
    this.setState({searchTerm: event.target.value});
    this.fulfillRequest(event.target.value);
    this.setState({selectedIndex: 0});

    if (event.target.value !== this.state.selectedItem.title) {
      this.setState({showSuggestions: true});
    }
  },

  navigateResults: function(event) {
    switch(event.which) {
      // Down arrow
      case 40:
        if ((this.state.selectedIndex + 1) <= this.state.tResults) {
          this.setSelected(this.state.selectedIndex += 1);
        }
        break;
      // Up arrow
      case 38:
        if (this.state.selectedIndex > 0) {
          this.setSelected(this.state.selectedIndex -= 1);
        }
        break;
      // ->
      case 39:
        this.setSelected(1);
        break;
      // Enter
      case 13:
        if (this.state.tResults === 1) {
          this.setSelected(1);
        }
        this.doit();
        break;
      // Tab
      case 9:
        if (this.state.tResults) {
          this.setSelected(1);
        }
        break;
      default:
        break;
    }

    if ([9, 13, 38, 39, 40].indexOf(event.which) > -1) {
      event.preventDefault();
    }
  },

  setSelected: function(idx) {
    this.setState({selectedIndex: idx});
  },

  doit: function() {
    var target;
    if (this.state.selectedIndex === 0) {
      target = 1;
    } else {
      target = this.state.selectedIndex
    }
     this.setState({selectedItem: this.refs[target].props});
     this.setState({searchTerm: this.refs[target].props.title})
     console.log(this.refs[target].props)
     this.setState({showSuggestions: false});
  },

  showSuggestions: function() {
    this.setState({showSuggestions: true});
  },

  render: function() {
    // This is used to ensure that each suggestion has a unique ref/id
    var resultCounter = 1;
    var keys = Object.keys(this.state.results);

    for (var key = 0; key < keys.length; key++) {
      var itemList = [];

      this.state.results[keys[key]].forEach(function(d) {
        itemList.push(<AutocompleteResultItem
                        title={d.name}
                        id={d.id}
                        dataset={keys[key]}
                        index={resultCounter}
                        key={resultCounter}
                        ref={resultCounter}
                        selected={this.state.selectedIndex}
                        notify={this.setSelected}
                        select={this.doit}
                      />);
        resultCounter += 1;
      }.bind(this));

      // Save this list as a property of the dataset
      this.state.results[keys[key]].toRender = itemList;

    }

    return (
      <div className='autocomplete-container'>
        <input
          ref='corbin'
          className='corbin'
          type='text'
          autoComplete='off'
          spellCheck='false'
          placeholder='Enter some text...'
          value={this.state.searchTerm}
          onKeyDown={this.navigateResults}
          onChange={this.update}
          onFocus={this.showSuggestions}
        />

        <div className={this.state.showSuggestions ? 'autocomplete-results' : 'hidden'}>
          {Object.keys(this.state.results).map(function(type, idx) {
            return (
              <div className={this.state.results[type].length ? 'autocomplete-result-category' : 'hidden' } key={idx}>
                <p className='autocomplete-result-category-title'>{this.props.categoryLookup[type]}</p>
                <ul className='autocomplete-result-category-list'>
                  {this.state.results[type].toRender}
                </ul>
              </div>
            );
          }.bind(this))}
        </div>
      </div>
    );
  }
});


export default Autocomplete;

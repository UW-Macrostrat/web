/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import {Component, createContext} from 'react';
import {feature} from 'topojson';
import h from 'react-hyperscript';
import {withCookies, Cookies} from 'react-cookie';
import {get} from 'axios';
import {instanceOf} from 'prop-types';
import update from 'immutability-helper';

const MacrostratColumnContext = createContext({});

class APIManager {
  constructor(baseURL){
    this.baseURL = baseURL;
  }
  get = async route=> {
    // Should handle unsuccessful queries
    const URI = this.baseURL+route;
    const {data: {success: {data}}} = await get(URI);
    return data;
  };
}

const getID = function(col){
  // This maps column objects to IDs
  // and transparently passes IDs forward
  if (typeof col ==='number') {
    // We were passed the ID
    return col;
  }
  return col.properties.col_id;
};

class MacrostratColumnManager extends Component {
  static initClass() {
    this.prototype.API = new APIManager("https://dev.macrostrat.org/api/v2");
    this.propTypes = {
      cookies: instanceOf(Cookies).isRequired
    };
    this.prototype.state = {
      hoveredColumn: null,
      columns: [],
      columnUnitIndex: {}
    };

    this.prototype.helpers = {
      isSame(col1, col2){
        // Checks if two columns are the same
        if (col1 == null) { return false; }
        if (col2 == null) { return false; }
        return getID(col1) === getID(col2);
      }
    };
  }

  constructor(props){
    super(props);
    this.setHoveredColumn = this.setHoveredColumn.bind(this);
    this.toggleSelected = this.toggleSelected.bind(this);
    this.clearSelection = this.clearSelection.bind(this);
    this.isSelected = this.isSelected.bind(this);
    this.getUnits = this.getUnits.bind(this);
    const {cookies} = this.props;

    // Create `selection` as a set of IDs, which will
    // be mapped out to objects when provided
    const selectedIDs = cookies.get('selected-columns') || [];
    this.state.selection = new Set(selectedIDs);
    selectedIDs.map(this.cacheUnitsForColumn);
  }

  async getColumnData() {
    const data = await this.API.get("/columns?format=topojson&all");
    const {features: columns} = feature(data, data.objects.output);
    return this.setState({columns});
  }

  cacheUnitsForColumn = async column=> {
    const id = getID(column);
    const {columnUnitIndex} = this.state;
    if (columnUnitIndex[id] != null) { return; }
    const data = await this.API.get(`/units?col_id=${id}&response=long`);
    const c = {};
    c[id] = {$set: data};
    const changeset = {columnUnitIndex: c};
    const state = update(this.state, changeset);
    return this.setState(state);
  };

  render() {
    const {children} = this.props;
    const {toggleSelected, clearSelection, getUnits} = this;
    // We store selected IDs but we provide objects
    let {selection, ...rest} = this.state;
    selection = this.state.columns.filter(col=> {
      const id = getID(col);
      return this.state.selection.has(id);
    });

    const value = {
      ...rest,
      selection,
      // Could generalize into a `dispatch` function
      // https://dev.to/washingtonsteven/reacts-new-context-api-and-actions-446o
      actions: {
        setHovered: this.setHoveredColumn,
        setSelected: this.setSelectedColumn,
        clearSelection,
        toggleSelected
      },
      helpers: {
        ...this.helpers,
        isSelected: this.isSelected,
        getUnits,
        getID
      }
    };
    return h(MacrostratColumnContext.Provider, {value, children});
  }

  componentDidMount() {
    return this.getColumnData();
  }

  componentDidUpdate(prevProps, prevState){
    // Update cookie for selection
    const {cookies} = this.props;
    const {selection} = this.state;
    const {selection: oldSelection} = prevState;
    if (selection !== oldSelection) {
      return cookies.set('selected-columns',selection);
    }
  }

  setHoveredColumn(col){
    return this.setState({hoveredColumn: col});
  }

  toggleSelected(col){
    let selection;
    const id = getID(col);
    if (this.isSelected(id)) {
      selection = {$remove: [id]};
    } else {
      selection = {$add: [id]};
      this.cacheUnitsForColumn(id);
    }
    const changeset = {selection};
    const newState = update(this.state, changeset);
    return this.setState(newState);
  }

  clearSelection() {
    const changeset = {selection: {$set: new Set([])}};
    const newState = update(this.state, changeset);
    return this.setState(newState);
  }

  isSelected(col){
    const id = getID(col);
    return this.state.selection.has(id);
  }

  getUnits(col){
    const id = getID(col);
    const {columnUnitIndex} = this.state;
    return columnUnitIndex[id] || null;
  }
}
MacrostratColumnManager.initClass();

// Wrap column manager for cookie access
MacrostratColumnManager = withCookies(MacrostratColumnManager);

const MacrostratColumnConsumer = MacrostratColumnContext.Consumer;
export {MacrostratColumnConsumer, MacrostratColumnManager};

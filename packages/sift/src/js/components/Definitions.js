import React from 'react';
import Utilities from './Utilities';
import NoData from './NoData';
import Loading from './Loading';
import _ from 'underscore';

if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.indexOf(searchString, position) === position;
  };
}

class Definitions extends React.Component {
  constructor(props) {
    super(props);
    this.filter = this.filter.bind(this);
    this._update = this._update.bind(this);
    this.showMore = this.showMore.bind(this);
    this.checkScrollPosition = this.checkScrollPosition.bind(this);
    this.state = this._resetState();
    this.stateLookup = {
      '' : {
        classifier: '',
        name: '',
        def: '',
        fields: []
      },
      'groups': {
        title: 'Groups',
        classifier: 'col_group_id',
        name: 'name',
        def: 'groups',
        route: 'group',
        fields: [{'field': 'col_group_id', 'desc': 'col_group_id'}, {'field': 'name', 'desc': 'name'}, {'field': 'col_group', 'desc': 'group'}]
      },
      'intervals': {
        title: 'Intervals',
        classifier: 'int_id',
        name: 'name',
        def: 'intervals',
        route: 'interval',
        fields: [{'field': 'int_id', 'desc': 'int_id'}, {'field': 'name', 'desc': 'name'}, {'field': 'int_type', 'desc': 'type'}, {'field': 'abbrev', 'desc': 'abbreviation'}, {'field': 't_age', 'desc': 'top age'}, {'field': 'b_age', 'desc': 'bottom age'}],
        sort: ['name', 'int_type']
      },
      'lithologies': {
        title: 'Lithologies',
        classifier: 'lith_id',
        name: 'name',
        def: 'lithologies',
        route: 'lithology',
        fields: [{'field': 'lith_id', 'desc': 'lith_id'}, {'field': 'name', 'desc': 'name'}, {'field': 'type', 'desc': 'type'}, {'field': 'class', 'desc': 'class'}, {'field': 'color', 'desc': 'color'}],
        sort: ['name', 'type', 'class']
      },
      'environments': {
        title: 'Environments',
        classifier: 'environ_id',
        name: 'name',
        def: 'environments',
        route: 'environment',
        fields: [{'field': 'environ_id', 'desc': 'lith_id'}, {'field': 'name', 'desc': 'name'}, {'field': 'type', 'desc': 'type'}, {'field': 'class', 'desc': 'class'}, {'field': 'color', 'desc': 'color'}],
        sort: ['name', 'type', 'class']
      },
      'economics': {
        title: 'Economics',
        classifier: 'econ_id',
        name: 'name',
        def: 'econs',
        route: 'economic',
        fields: [{'field': 'econ_id', 'desc': 'lith_id'}, {'field': 'name', 'desc': 'name'}, {'field': 'type', 'desc': 'type'}, {'field': 'class', 'desc': 'class'}, {'field': 'color', 'desc': 'color'}],
        sort: ['name', 'type', 'class']
      },
      'columns': {
        title: 'Columns',
        classifier: 'col_id',
        name: 'col_name',
        def: 'columns',
        route: 'column',
        fields: [{'field': 'col_id', 'desc': 'col_id'}, {'field': 'col_name', 'desc': 'name'}, {'field': 'status', 'desc': 'active'}, {'field': 'col_group_id', 'desc': 'group'}]
      },
      'strat_names': {
        title: 'Stratigraphic Names',
        classifier: 'strat_name_id',
        name: 'strat_name',
        def: 'strat_names',
        route: 'strat_name',
        fields: [{'field': 'strat_name_id', 'desc': 'strat_name_id'}, {'field': 'strat_name_long', 'desc': 'name'}, {'field': 'rank', 'desc': 'rank'}, {'field': 't_units', 'desc': 'total units'}]
      },
      'strat_name_concepts': {
        title: 'Stratigraphic Name Concepts',
        classifier: 'concept_id',
        name: 'name',
        def: 'strat_name_concepts',
        route: 'strat_name_concept',
        fields: [{'field': 'concept_id', 'desc': 'concept_id'}, {'field': 'name', 'desc': 'name'}, {'field': 'province', 'desc': 'province'}, {'field': 'geologic_age', 'desc': 'age'}]
      }
    }
  }

  _resetState() {
    return {
      type: '',
      loading: false,
      data: [{id: '', name: ''}],
      filtered: [{id: '', name: ''}],
      visible: [{id: '', name: ''}],
      showing: 100
    }
  }

  _update(type) {
    this.setState({
      loading: true
    });

    Utilities.fetchData(`defs/${this.stateLookup[type].def}?all`, (error, data) => {
      if (error || !data.success || data.error) {
        return this.setState(this._resetState());
      }

      // Sort, if applicable
      if (this.stateLookup[type].sort) {
        this.stateLookup[type].sort.forEach(function(d) {
          data.success.data = _.sortBy(data.success.data, d);
        });
      }

      this.setState({
        type: type,
        data: data.success.data,
        filtered: data.success.data,
        visible: data.success.data.slice(0, this.state.showing),
        loading: false
      });
    });
  }

  componentDidMount() {
    window.addEventListener("scroll", this.checkScrollPosition);
    this._update(this.props.params.type);
  }

  componentWillReceiveProps(nextProps) {
    // Only update if the URI actually changed
    if (nextProps.params.type !== this.props.params.type) {
      this._update(nextProps.params.type);
    }
  }

  checkScrollPosition() {
    if (window.scrollY < 800) {
      this.setState({
        showing: 100
      });
    }
    if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight)) {
      this.showMore();
    }
  }

  showMore() {

    var more = this.state.showing + 100;

    this.setState({
      showing: more,
      visible: this.state.filtered.slice(0, more)
    });
  }

  filter() {
    var input = event.target.value.toLowerCase()

    var filtered = this.state.data.filter(d => {
      if (d[this.stateLookup[this.state.type].name].toLowerCase().startsWith(input)) {
        return d;
      }
    });

    this.setState({
      filtered: filtered,
      visible: filtered.slice(0, this.state.showing)
    });
  }

  goToPage(event) {
    window.document.location = event.target.parentNode.getAttribute('data-url');
  }

  render() {

    return (
      <div className='page-content'>
        <Loading
          loading={this.state.loading}
        />
        <NoData
          features={this.state.data}
          type={'definitions'}
          loading={this.state.loading}
        />

        <div className={this.state.data.length ? 'def-page' : 'hidden'}>
          <div className='def-page-title'>
            <a href={'#/definitions/' + this.state.type}><small>definitions / </small>{this.stateLookup[this.state.type].title}</a>
          </div>

          <input
            className='filter-input'
            type='text'
            autoComplete='off'
            spellCheck='false'
            placeholder='Filter...'
            value={this.state.searchTerm}
            onChange={this.filter}
          />

        <table className='table table-hover table-stripped def-table'>
            <thead>
              <tr>
                {this.stateLookup[this.state.type].fields.map((d, idx) => {
                  return (
                    <th key={idx}>{d.desc}</th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {this.state.visible.map((d, idx) => {
                return (
                  <tr key={idx} data-url={'#/' + this.stateLookup[this.state.type].route + '/' + d[this.stateLookup[this.state.type].classifier]} onClick={this.goToPage}>
                    {this.stateLookup[this.state.type].fields.map((j, jidx) => {
                      return (
                        <td key={jidx}>{d[j.field]}</td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    );

  }
}

Definitions.contextTypes = {
  router: React.PropTypes.func.isRequired
}

export default Definitions;

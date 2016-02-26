import React from 'react';
import Utilities from './Utilities';
import Autocomplete from './Autocomplete';

class Explore extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showFilters: false
    }

    this.filters = [];

    this.toggleFilters = this.toggleFilters.bind(this);
    this.finishAutocomplete = this.finishAutocomplete.bind(this);
    this.addFilter = this.addFilter.bind(this);
    this.removeFilter = this.removeFilter.bind(this);
    this.refreshMap = this.refreshMap.bind(this);
    this.checkFilters = this.checkFilters.bind(this);
  }

  componentDidMount() {
    if (this.map) {
      this.map.remove();
    }

    this.checkFilters();

    var map = this.map = L.map(document.getElementById('exploreMap'), {
      minZoom: 2,
      maxZoom: 10,
      scrollWheelZoom: true,
      touchZoom: true,
      worldCopyJump: true,
      zoomControl: false
    }).setView([28, -20], 3);

    L.control.zoom({position: 'topright'}).addTo(map);

    var hash = new L.Hash(map, {
      baseURI: '#/explore/',
      query: true
    });

    L.tileLayer('https://{s}.tiles.mapbox.com/v3/jczaplewski.j751k57j/{z}/{x}/{y}.png', {
      attribution: "<a href='https://www.mapbox.com/about/maps/' target='_blank'>&copy; Mapbox &copy; OpenStreetMap</a>"
    }).addTo(map);

    Utilities.fetchMapData(`columns?all`, (error, geojson, refs) => {
      if (this.layer) {
        this.layer.clearLayers();
      }
      if (!(geojson.features.length)) {
        return;
      }

      this.columns = geojson;
      //this.props.updateRefs(Object.keys(refs).map(function(d) { return refs[d] }));

      this.layer = L.geoJson(geojson, {
        style: (feature) => {
          return {
            color: '#777777',
            fillOpacity: 0.4,
            opacity: 0.8,
            weight: 1,
            outline: 0
          }
        },
        onEachFeature: (feature,layer) => {
          layer.bindPopup(`
            <div class='pbdb-popup'>
              <a class='pbdb-popup-link'
                href='#/column/${feature.properties.col_id}'
              >
                ${feature.properties.col_name}
              </a>
              <br>
              <a class='index-map-group-link' href='#/group/${feature.properties.col_group_id}'>
                ${feature.properties.col_group} (${feature.properties.group_col_id})
              </a>
            </div>
          `)
        }
      }).addTo(this.map);
    });
  }

  checkFilters() {
    var filters = location.hash.split('?')[1];

    // if filters are present in the URI get their definitions (name, etc)
    if (filters) {
      var newFilters = [];

      // Remove types and classes from the request
      var query = filters.split('&').filter(d => {
        if (d.indexOf('_class') < 0 || d.indexOf('_type') < 0) {
          return d;
        } else {
          newFilters.push({
            dataset: this.props.datasetLookup[d.split('=')[0]],
            id: '',
            title: d.split('=')[1]
          });
        }
      }).join('&');

      if (!query) {
        return;
      }

      // Fetch definitions
      Utilities.fetchData(`defs/define?${query}`, (error, data) => {
        if (error || !data.success) {
          console.log('error fetching definitions');
        } else {
          Object.keys(data.success.data).forEach(def_type => {
            data.success.data[def_type].forEach(i => {
              var idKey = Object.keys(i).filter(j => {
                if (j.indexOf('_id') > -1) {
                  return j
                }
              })[0];

              newFilters.push({
                dataset: def_type,
                id: i[idKey],
                title: i.name
              });
            });
          });

          this.filters = newFilters;
          this.refreshMap();
        }
      });
    }
  }

  toggleFilters(event) {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    this.setState({
      showFilters: !this.state.showFilters
    });
  }

  refreshMap() {
    this.forceUpdate();

    var queryString = this.filters.map(filter => {
      return this.props.idLookup[filter.dataset] + '=' + ((filter.dataset.indexOf('_type') > -1 || filter.dataset.indexOf('_class') > -1) ? filter.title : filter.id);
    }).join('&');


    if (!queryString.length) {
      this.layer.clearLayers();
      this.layer.addData(this.columns);
      return;
    }

    Utilities.fetchData(`columns?${queryString}`, (error, data) => {
      if (error || !data.success) {
        console.log('Error refreshing map - ', error);
      } else {
        var targetColumns = data.success.data.map(function(d) { return d.col_id; })
        this.layer.clearLayers();

        this.layer.addData(
          {"type": "FeatureCollection",
           "features": this.columns.features.filter(function(column) {
             if (targetColumns.indexOf(column.properties.col_id) > -1) {
               return column;
             }
           })}
        );
      }
    });
  }

  updateHash() {
    location.hash = location.hash.split('?')[0] + '?' + this.filters.map(function(filter) {
      return this.props.idLookup[filter.dataset] + '=' + ((filter.dataset.indexOf('_type') > -1 || filter.dataset.indexOf('_class') > -1) ? filter.title : filter.id);
    }.bind(this)).join('&');
  }

  addFilter(item) {
    this.filters.push(item);

    this.updateHash();

    this.refreshMap();
  }

  removeFilter(item, event) {
    event.stopPropagation();
    console.log(item);
    this.filters = this.filters.filter(function(d) {
      console.log(d.id, item.id)
      if (d.id != item.id) {
        return d;
      }
    });

    this.updateHash();

    this.refreshMap();
  }

  finishAutocomplete(item) {
    this.addFilter({
      dataset: item.dataset,
      id: item.id,
      title: item.title
    });
  }

  render() {
    return (
      <div>
        <div className='autocomplete-wrapper'>
          <div className='autocomplete-wrapper-explore'>
            <Autocomplete
              minLength='2'
              reportState={this.toggleAutocomplete}
              onComplete={this.finishAutocomplete}
            />
          </div>

        </div>

        <div id='exploreMap'></div>
        <div className='filterMenu' className={this.state.showFilters ? 'filterMenu open' : 'filterMenu'}>
          <div className='filterMenu-tab' onClick={this.toggleFilters}>
            <div className='filterMenu-tab-text'>Filters</div>
          </div>
          <div className='filterMenu-content'>
            {this.filters.map((filter, idx) => {
              return (
                <div className='filterMenu-filter' key={idx}>
                  {filter.title}
                  <span className='filterMenu-filter-close' onClick={this.removeFilter.bind(null, filter)}>x</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    );
  }
}

Explore.defaultProps = {
  idLookup: {
    'columns': 'col_id',
    'intervals': 'int_id',
    'strat_name_concepts': 'strat_name_concept_id',
    'strat_name_orphans': 'strat_name_id',
    'lithologies': 'lith_id',
    'lithology_types': 'lith_type',
    'lithology_classes': 'lith_class',
    'environments': 'environ_id',
    'environment_types': 'environ_type',
    'enviornment_classes': 'environ_class',
    'econs': 'econ_id',
    'econ_types': 'econ_type',
    'econ_classes': 'econ_class'
  },
  datasetLookup: {
    'col_id': 'columns',
    'int_id': 'intervals',
    'strat_name_concept_id': 'strat_name_concepts',
    'strat_name_id': 'strat_name_orphans',
    'lith_id': 'lithologies',
    'lith_type': 'lithology_types',
    'lith_class': 'lithology_classes',
    'environ_id': 'environments',
    'environ_type': 'environment_types',
    'environ_class': 'enviornment_classes',
    'econ_id': 'econs',
    'econ_type': 'econ_types',
    'econ_class': 'econ_classes'
  }
}
export default Explore;

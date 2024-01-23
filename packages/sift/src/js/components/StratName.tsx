import React from 'react';
import Utilities from './Utilities';
import Chart from './Chart';
import Map from './Map';
import SummaryStats from './SummaryStats';
import ChartLegend from './ChartLegend';
import StratNameHierarchy from './StratNameHierarchy';
import NoData from './NoData';
import Loading from './Loading';
import PrevalentTaxa from './PrevalentTaxa';
import MapControls from './MapControls';
import LongText from './LongText';
import Footer from './Footer';


class StratName extends React.Component {
  constructor(props) {
    super(props);
    this.stateLookup = {
      'strat_name_concept': 'strat_name_concept_id',
      'strat_name': 'strat_name_id'
    },
    this.state = this._resetState()
  }

  _resetState() {
    return {
      loading: false,
      outcropLoading: false,
      type: '',
      id: '',
      mapData: {features: [], _id: -1},
      fossils: {features: [], _id: -1},
      outcropData: {features: [], _id: -1},
      prevalentTaxa: [{oid: null, nam: '', img: null, noc: null}],
      liths: [],
      econs: [],
      strat_names: [],
      strat_name_ids: [],
      refs: [],
      concept: {
        concept_id: null,
        name: '',
        geologic_age: '',
        int_id: null,
        usage_notes: '',
        other: '',
        province: ''
      },
      name: {
        name: '',
        id: '',
        url: ''
      },
      environs: [],
      summary: {
        col_area: '',
        max_thick: '',
        min_thick: '',
        b_age: '',
        t_age: '',
        pbdb_collections: '',
        t_units: '',
        t_sections: ''
      },
      properties: {
        col_group: '',
        col_group_id: '',
        group_col_id: '',
        unit_id: '',
        unit_name: '',
        strat_name_id: '',
        col_area: '',
        max_thick: '',
        min_thick: '',
        b_age: '',
        t_age: '',
        pbdb_collections: '',
        t_units: '',
        t_sections: ''
      }
    }
  }

  setLegend(which, html) {
    document.getElementById(which + '-legend').innerHTML = html
  }

  _update(type, id) {
    this.setState({
      loading: true
    });
    /*
      1. Get columns -- strat_name_id = ? || concept_id = ?
      (async)
        2. Get fossils
        2.5. Get prevalent taxa
      3. Get strat_name_concept -- strat_name_id = ? || concept_id = ?
      4. Get strat_names for concept returned above
      5. if type === strat_name, get strat_names for strat_name_id
    */

    // Get column geometry for map and summary attributes
    Utilities.fetchMapData(`columns?${type}=${id}&response=long`, (mapError, data, refs) => {
      if (mapError || !data.features.length) {
        console.log('reset')
        this.setState(this._resetState());
      }

      var parsedRefs = Object.keys(refs).map(d => { return refs[d] });

      // Get fossil data (async)
      Utilities.fetchMapData(`fossils?${type}=${id}`, (fossilError, fossilData) => {
        if (fossilError) {
          return console.log("Error fetching fossils ", error);
        }
        this.setState({
          fossils: fossilData
        });

        var collections = fossilData.features.map(d => { return d.properties.cltn_id });

        // If there are any fossil collections, get prevalent taxa from PBDB
        if (collections.length) {
          Utilities.fetchPrevalentTaxa(collections.join(','), (prevalentError, prevalentData) => {
            if (prevalentError) {
              return;
            }
            // Normalize the names a bit
            prevalentData.records.forEach(d => {
              var splitName = d.nam.split(' ');
              d.nam = splitName[0] + ( (splitName.length > 1) ? '*' : '');
            });

            this.setState({
              prevalentTaxa: prevalentData.records
            });
          });
        } else {
          this.setState({
            prevalentTaxa: [{oid: null, nam: '', img: null, noc: null}]
          });
        }
      });

      // Get the concept of whatever name or concept we are looking at
      Utilities.fetchData(`defs/strat_name_concepts?${type}=${id}`, (conceptError, conceptData) => {
        if (conceptError || !conceptData.success) {
          return this.setState(this._resetState());
        }

        if (conceptData.success && conceptData.success.refs) {
          parsedRefs = parsedRefs.concat(Object.keys(conceptData.success.refs).map(d => { return conceptData.success.refs[d] }));

        }

        var params;
        if (!conceptData.success.data.length) {
          params = `strat_name_id=${id}`;
        } else {
          var concept_id = conceptData.success.data[0].concept_id
          params = `strat_name_concept_id=${concept_id}`;
        }
        // Get all strat names associated with that concept for the concept component

        Utilities.fetchData('defs/strat_names?' + params, (stratNameConceptError, stratNameConceptData) => {
          if (stratNameConceptError || !stratNameConceptData.success) {
            return this.setState(this._resetState());
          }

          // Determine the main info for the page
          var name;

          if (type === 'strat_name_id') {
            var target = stratNameConceptData.success.data.filter(d => {
              if (d.strat_name_id == id) {
                return d;
              }
            });

            if (target.length) {
              name = {
                id: target[0].strat_name_id,
                name: target[0].strat_name + ' ' + target[0].rank,
                url: '#/strat_name/' + target[0].strat_name_id,
              }
            }
          } else {
            name = {
              id: conceptData.success.data[0].concept_id,
              name: conceptData.success.data[0].name,
              url: '#/strat_name_concept/' + conceptData.success.data[0].concept_id
            }
          }

          // Set the state
          this.setState({
            name: name,
            concept: conceptData.success.data[0] || {
              concept_id: null,
              name: '',
              geologic_age: '',
              int_id: null,
              usage_notes: '',
              other: '',
              province: '',
              url: '',
              author: ''
            },
            strat_names: stratNameConceptData.success.data.sort((a,b) => {
              if (a.t_units > b.t_units) {
                return -1;
              }
              return 1;
            }),
            liths: Utilities.parseAttributes('lith', Utilities.summarizeAttributes('lith', data.features)),
            environs: Utilities.parseAttributes('environ', Utilities.summarizeAttributes('environ', data.features)),
            econs: Utilities.parseAttributes('econ', Utilities.summarizeAttributes('econ', data.features)),
            strat_name_ids: stratNameConceptData.success.data.map(d => { return d.strat_name_id }).filter(d => { if (d) { return d } }),
            mapData: data,
            outcropData: {features: [], _id: -1},
            showOutcrop: false,
            summary: Utilities.summarize(data.features),
            type: type,
            id: id,
            refs: parsedRefs,
            loading: false
          });
        });
      });
    });
  }


  componentDidMount() {
    var currentRoutes = this.context.router.getCurrentRoutes();
    var activeRoute = currentRoutes[currentRoutes.length - 1].name;

    this._update(this.stateLookup[activeRoute], this.props.params.id);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.params.id !== this.props.params.id) {
      var currentRoutes = this.context.router.getCurrentRoutes();
      var activeRoute = currentRoutes[currentRoutes.length - 1].name;

      this._update(this.stateLookup[activeRoute], nextProps.params.id);
    }
  }

  render() {
    var rankMap = {'SGp': null, 'Gp': 'sgp', 'Fm': 'gp', 'Mbr': 'fm', 'Bed': 'mbr', 1: null, 2: 'sgp', 3: 'gp', 4: 'fm', 5: 'fm'};
    var rankFormat = {'SGp': null, 'Gp': 'SGp', 'Fm': 'Gp', 'Mbr': 'Fm', 'Bed': 'Mbr'}

    var lithChart;
    var environChart;
    var econChart;
    var stratHierarchy;
    var totalCharts = 0;
    if (this.state.econs.length) {
      totalCharts += 1;
      econChart = <div>
        <Chart
        title='Economic'
        id={'column-econ-chart'}
        data={this.state.econs}
        shareLegend={this.setLegend}
        returnLegend={true}
      />
      <div id='column-econ-chart-legend'></div>
      </div>
    }

    if (this.state.liths.length) {
      totalCharts += 1;
      lithChart = <div>
        <Chart
          title='Lithology'
          id={'column-lith-chart'}
          data={this.state.liths}
          shareLegend={this.setLegend}
          returnLegend={true}
        />
        <div id='column-lith-chart-legend'></div>
      </div>
    }

    if (this.state.environs.length) {
      totalCharts += 1;
      environChart = <div>
        <Chart
          title='Environment'
          id={'column-environ-chart'}
          data={this.state.environs}
          shareLegend={this.setLegend}
          returnLegend={true}
        />
      <div id='column-environ-chart-legend'></div>
      </div>
    }

    var chartClass = (totalCharts > 1 ? 'col-sm-' + (12/totalCharts) : 'col-sm-6 col-sm-offset-3');

    if (this.state.type === 'strat_name_id') {
      stratHierarchy = <StratNameHierarchy
        stratNameID={this.state.id}
      />
    }

    return (
      <div className='page-content'>
        <Loading
          loading={this.state.loading}
        />

        <NoData
          features={this.state.strat_names}
          type={'name'}
          loading={this.state.loading}
        />

        <div className={this.state.mapData.features.length ? '' : 'hidden'}>
          <div className='page-title'>
            <a href={this.state.name.url}>{this.state.name.name}</a>
          </div>

          <div className='random-column'>
            <div className='random-column-stats'>
              <SummaryStats
                data={this.state.summary}
              />
            </div>

            <Map
              className='table-cell'
              data={this.state.mapData}
              target={false}
              stratNameIDs={this.state.strat_name_ids}
              fossils={this.state.fossils}
            />
          </div>

          <div className='row chart-row'>
            <div className={chartClass}>
              {lithChart}
            </div>
            <div className={chartClass}>
              {environChart}
            </div>
            <div className={chartClass}>
              {econChart}
            </div>
          </div>

          <PrevalentTaxa data={this.state.prevalentTaxa} />

        </div>

        <div className={this.state.concept.concept_id ? 'row concept-info' : 'hidden'}>
          <div className='col-sm-12'>
            <div className='concept-group-title'>
              <h3>{this.state.concept.name}</h3><span className='concept-ref'>via <a href={this.state.concept.url} target='_blank' className='normalize-link'>{ this.state.concept.author }</a></span>
            </div>
          </div>
          <div className='col-sm-4'>
            <div className='concept-group-attributes'>
              {this.state.concept.province ? <LongText title='Province' text={this.state.concept.province}/> : ''}
              {this.state.concept.geologic_age ? <LongText title='Age' text={this.state.concept.geologic_age}/> : ''}
              {this.state.concept.other ? <LongText title='Notes' text={this.state.concept.other}/> : ''}
              {this.state.concept.usage_notes ? <LongText title='Usage' text={this.state.concept.usage_notes}/> : ''}
            </div>
          </div>
          <div className='col-sm-8'>
            <div className='list-group concept-names'>
              {this.state.strat_names.map((d,i) => {
                var parent = (d[rankMap[d.rank]]) ? ' of ' + d[rankMap[d.rank]] + ' ' + rankFormat[d.rank] : '';
                return <a key={i} href={'#/strat_name/' + d.strat_name_id} className='list-group-item'>{d.strat_name} {d.rank} {parent} <span className='badge'>{d.t_units}</span></a>
              })}
            </div>
          </div>
        </div>

        {stratHierarchy}

        <Footer data={this.state.refs}/>
      </div>
    );

  }
}

StratName.contextTypes = {
  router: React.PropTypes.func.isRequired
}

export default StratName;

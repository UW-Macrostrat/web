import React from 'react';
import Utilities from './Utilities';
import Chart from './Chart';
import Map from './Map';
import SummaryStats from './SummaryStats';
import ChartLegend from './ChartLegend';
import StratNameHierarchy from './StratNameHierarchy';
import NoData from './NoData';
import Loading from './Loading';

class StratName extends React.Component {
  constructor(props) {
    super(props);
    this.toggleOutcrop = this.toggleOutcrop.bind(this);
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
      outcropData: {features: [], _id: -1},
      showOutcrop: false,
      liths: [],
      econs: [],
      strat_names: [],
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
    if (type === 'strat_name_concept_id') {
      Utilities.fetchMapData(`columns?${type}=${id}&response=long`, (mapError, data) => {
        Utilities.fetchData(`defs/strat_names?${type}=${id}`, (stratNameError, stratNameData) => {
          Utilities.fetchData(`defs/strat_name_concepts?concept_id=${id}`, (conceptError, conceptData) => {
              if (mapError || stratNameError || conceptError || !data.features.length) {
                return this.setState(this._resetState());
              }
              this.setState({
                name: {
                  id: conceptData.success.data[0].concept_id,
                  name: conceptData.success.data[0].name,
                  url: '#/strat_name_concept/' + conceptData.success.data[0].concept_id
                },
                strat_names: stratNameData.success.data.sort((a,b) => {
                  if (a.t_units > b.t_units) {
                    return -1;
                  }
                  return 1;
                }),
                liths: Utilities.parseAttributes('lith', Utilities.summarizeAttributes('lith', data.features)),
                environs: Utilities.parseAttributes('environ', Utilities.summarizeAttributes('environ', data.features)),
                econs: Utilities.parseAttributes('econ', Utilities.summarizeAttributes('econ', data.features)),
                mapData: data,
                outcropData: {features: [], _id: -1},
                showOutcrop: false,
                summary: Utilities.summarize(data.features),
                type: type,
                id: id,
                loading: false
              });
          });
        });
      });

    } else {
      Utilities.fetchMapData(`columns?${type}=${id}&response=long`, (mapError, data) => {
        Utilities.fetchData(`defs/strat_names?${type}=${id}`, (error, stratNameData) => {
            if (mapError || error || !data.features.length) {
              return this.setState(this._resetState());
            }
            this.setState({
              name: {
                id: stratNameData.success.data[0].strat_name_id,
                name: stratNameData.success.data[0].strat_name + ' ' + stratNameData.success.data[0].rank,
                url: '#/strat_name/' + stratNameData.success.data[0].strat_name_id
              },
              strat_names: [],
              liths: Utilities.parseAttributes('lith', Utilities.summarizeAttributes('lith', data.features)),
              environs: Utilities.parseAttributes('environ', Utilities.summarizeAttributes('environ', data.features)),
              econs: Utilities.parseAttributes('econ', Utilities.summarizeAttributes('econ', data.features)),
              mapData: data,
              outcropData: {features: [], _id: -1},
              showOutcrop: false,
              summary: Utilities.summarize(data.features),
              type: type,
              id: id,
              loading: false
            });
        });
      });
    }
  }

  toggleOutcrop() {
    if (!(this.state.outcropData.features.length)) {
      var ids = (this.state.type === 'strat_name_id') ? this.state.id : this.state.strat_names.map(d => { return d.strat_name_id}).join(',');

      console.log("need to fetch burwell polys");
      this.setState({
        outcropLoading: true
      });
      Utilities.fetchMapData(`geologic_units/burwell?scale=medium&strat_name_id=${ids}&map=true`, (error, data) => {
        this.setState({
          outcropData: data,
          showOutcrop: !this.state.showOutcrop,
          outcropLoading: false
        });
      });
    } else {
      console.log("simply toggle")
      this.setState({
        showOutcrop: !this.state.showOutcrop
      });
    }
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

    if (this.state.type === 'strat_name_id') {
      stratHierarchy = <StratNameHierarchy
        stratNameID={this.state.id}
      />
    }

  /*  if (this.state.mapData.features.length < 1) {
      return (
        <div className='no-results'>
          <h1>No data matched to this unit</h1>
        </div>
      )
    }*/

    return (
      <div>
        <div className='page-title'>
          <a href={this.state.name.url}>{this.state.name.name}</a>
          <div className='list-group concept-names'>
            {this.state.strat_names.map((d,i) => {
              var parent = (d[rankMap[d.rank]]) ? ' of ' + d[rankMap[d.rank]] + ' ' + rankMap[d.rank] : '';
              return <a key={i} href={'#/strat_name/' + d.strat_name_id} className='list-group-item'>{d.strat_name} {d.rank} {parent} <span className='badge'>{d.t_units}</span></a>
            })}
          </div>
        </div>

        <Loading
          loading={this.state.loading}
        />

        <NoData
          features={this.state.mapData.features}
          type={'name'}
          loading={this.state.loading}
        />

        <div className={this.state.mapData.features.length ? '' : 'hidden'}>

          <div className='random-column'>
            <div className='random-column-stats'>
              <SummaryStats
                data={this.state.summary}
              />
            </div>
            <div className={'random-column-stats toggleOutcrop ' + ((this.state.showOutcrop) ? 'active' : '')} onClick={this.toggleOutcrop}>
              <div className={'outcrop ' + ((this.state.showOutcrop) ? 'active' : '')}></div>
            </div>

            <Loading
              loading={this.state.outcropLoading}
            />

            <Map
              className='table-cell'
              data={this.state.mapData}
              target={false}
              showOutcrop={this.state.showOutcrop}
              outcrop={this.state.outcropData}
            />
          </div>

          <div className='row'>
            <div className={'col-sm-' + (12/totalCharts)}>
              {lithChart}
            </div>
            <div className={'col-sm-' + (12/totalCharts)}>
              {environChart}
            </div>
            <div className={'col-sm-' + (12/totalCharts)}>
              {econChart}
            </div>
          </div>

          {stratHierarchy}
        </div>
      </div>
    );

  }
}

StratName.contextTypes = {
  router: React.PropTypes.func.isRequired
}

export default StratName;

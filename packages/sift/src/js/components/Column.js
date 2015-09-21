import React from 'react';
import Utilities from './Utilities';
import Chart from './Chart';
import Map from './Map';
import Config from './Config';
import SummaryStats from './SummaryStats';
import ChartLegend from './ChartLegend';
import StratColumn from './StratColumn';
import NoData from './NoData';
import Loading from './Loading';
import PrevalentTaxa from './PrevalentTaxa';

class Column extends React.Component {
  constructor(props) {
    super(props);
    this.state = this._resetState();
    this.toggleOutcrop = this.toggleOutcrop.bind(this);
  }

  _resetState() {
    return {
      loading: false,
      outcropLoading: false,
      mapData: {features: [], _id: -1},
      fossils: {features: [], _id: -1},
      outcropData: {features: [], _id: -1},
      showOutcrop: false,
      prevalentTaxa: [{oid: null, nam: '', img: null, noc: null}],
      units: [],
      column: {},
      liths: [],
      econs: [],
      environs: [],
      strat_name_ids: [],
      cltn_ids: [],
      properties: {
        col_id: '',
        col_name: '',
        col_group: '',
        col_group_id: '',
        group_col_id: '',
        col_area: '',
        project_id: '',
        max_thick: '',
        min_thick: '',
        b_age: '',
        t_age: '',
        pbdb_collections: '',
        lith: [],
        environ: [],
        econ: [],
        t_units: '',
        t_sections: ''
      }
    }
  }

  setLegend(which, html) {
    document.getElementById(which + '-legend').innerHTML = html
  }

  toggleOutcrop() {
    if (!(this.state.outcropData.features.length)) {
      var ids = this.state.strat_name_ids.join(',');
      console.log(ids);
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

  _update(id) {
    this.setState({
      loading: true
    });
    Utilities.fetchMapData(`columns?col_id=${id}&response=long&adjacents=true`, (error, data) => {
      Utilities.fetchData(`units?col_id=${id}&response=long`, (unitError, unitData) => {
        if (error || unitError || !data.features.length) {
          return this.setState(this._resetState());
        }
        Utilities.fetchMapData(`fossils?col_id=${id}`, (fossilError, fossilData) => {
          if (fossilError) {
            return console.log("Error fetching fossils ", error);
          }
          this.setState({
            fossils: fossilData,
            cltn_ids: fossilData.features.map(d => { return d.properties.cltn_id })
          });

          var collections = fossilData.features.map(d => { return d.properties.cltn_id });

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

        this.setState({
          units: unitData.success.data,
          liths: Utilities.parseAttributes('lith', data.features[0].properties.lith),
          environs: Utilities.parseAttributes('environ', data.features[0].properties.environ),
          econs: Utilities.parseAttributes('econ', data.features[0].properties.econ),
          strat_name_ids: unitData.success.data.map(d => { return d.strat_name_id }).filter(d => { if (d) { return d } }),
          mapData: data,
          outcropData: {features: [], _id: -1},
          properties: data.features[0].properties,
          loading: false
        });
      });
    });
  }

  componentDidMount() {
    this._update(this.props.params.id);
  }

  componentWillReceiveProps(nextProps) {
    console.log('column update')
    if (nextProps.params.id !== this.props.params.id) {
      this._update(nextProps.params.id);
    }
  }

  render() {
    //console.log('column render');
    if (!this.state.properties) {
      return <h3>Loading...</h3>
    } else {
      var lithChart;
      var environChart;
      var econChart;
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

      return (
        <div>
          <div className='page-title'>
            {this.state.properties.col_id ? <p><a href={'#/column/' + this.state.properties.col_id}>{this.state.properties.col_name} </a>
          <small><a href={'#/group/' + this.state.properties.col_group_id}>({this.state.properties.col_group} {this.state.properties.col_id})</a></small></p>: ''}

          </div>

          <Loading
            loading={this.state.loading}
          />

          <NoData
            features={this.state.mapData.features}
            type={'column'}
            loading={this.state.loading}
          />

          <div className={this.state.mapData.features.length ? '' : 'hidden'}>
            <div className='random-column'>
              <div className='random-column-stats'>
                <SummaryStats
                  data={this.state.properties}
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
                fossils={this.state.fossils}
                showOutcrop={this.state.showOutcrop}
                outcrop={this.state.outcropData}
                target={true}
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

            <PrevalentTaxa data={this.state.prevalentTaxa} />

            <StratColumn data={this.state.units}/>
            <a href={'https://dev.macrostrat.org/unit-renderer/#/column=' + this.state.properties.col_id} target='_blank' className='normalize-link alternate-column'>Alternate column view</a>
          </div>
        </div>
      );
    }

  }
}

Column.contextTypes = {
  router: React.PropTypes.func.isRequired
}

export default Column;

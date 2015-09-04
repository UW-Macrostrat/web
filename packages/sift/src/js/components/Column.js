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

class Column extends React.Component {
  constructor(props) {
    super(props);
    this.state = this._resetState();
  }

  _resetState() {
    return {
      loading: false,
      mapData: {features: [], _id: -1},
      units: [],
      column: {},
      liths: [],
      econs: [],
      environs: [],
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

  _update(id) {
    this.setState({
      loading: true
    });
    Utilities.fetchMapData(`columns?col_id=${id}&response=long&adjacents=true`, (error, data) => {
      Utilities.fetchData(`units?col_id=${id}&response=long`, (unitError, unitData) => {
        if (error || unitError || !data.features.length) {
          return this.setState(this._resetState());
        }
        this.setState({
          units: unitData.success.data,
          liths: Utilities.parseAttributes('lith', data.features[0].properties.lith),
          environs: Utilities.parseAttributes('environ', data.features[0].properties.environ),
          econs: Utilities.parseAttributes('econ', data.features[0].properties.econ),
          mapData: data,
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
          <small><a href={'#/group/' + this.state.properties.col_group_id}>({this.state.properties.col_group} {this.state.properties.col_group_id})</a></small></p>: ''}

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
              <Map
                className='table-cell'
                data={this.state.mapData}
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

            <StratColumn data={this.state.units}/>
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

import React from 'react';
import Utilities from './Utilities';
import Chart from './Chart';
import Map from './Map';
import SummaryStats from './SummaryStats';
import ChartLegend from './ChartLegend';
import NoData from './NoData';
import Loading from './Loading';

class Economic extends React.Component {
  constructor(props) {
    super(props);
    this.state = this._resetState();
    this.stateLookup = {
      'economic': 'econ_id',
      'economic_type': 'econ_type',
      'economic_class': 'econ_class'
    }
  }

  _resetState() {
    return {
      type: '',
      id: '',
      loading: false,
      mapData: {features: [], _id: -1},
      liths: [],
      econs: [],
      environs: [],
      target: {
        name: '',
        lith_id: ''
      },
      summary: {
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
    Utilities.fetchMapData(`columns?${type}=${id}&response=long`, (error, data) => {
      Utilities.fetchData(`defs/econs?${type}=${id}`, (econError, econData) => {
        if (error || econError || !data.features.length) {
          return this.setState(this._resetState());
        }

        this.setState({
          type: type,
          id: id,
          liths: Utilities.parseAttributes('lith', Utilities.summarizeAttributes('lith', data.features)),
          environs: Utilities.parseAttributes('environ', Utilities.summarizeAttributes('environ', data.features)),
          econs: Utilities.parseAttributes('econ', Utilities.summarizeAttributes('econ', data.features)),
          summary: Utilities.summarize(data.features),
          properties: data.features[0].properties,
          mapData: data,
          target: (typeof(id) == 'string' ? {'name': id} :  econData.success.data[0]),
          loading: false
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
          <a href={'#/lithology/' + this.state.target.lith_id}>{this.state.target.name}</a>
        </div>

        <Loading
          loading={this.state.loading}
        />
        <NoData
          features={this.state.mapData.features}
          type={'lithology'}
          loading={this.state.loading}
        />

        <div className={this.state.mapData.features.length ? '' : 'hidden'}>
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
        </div>
      </div>
    );

  }
}

Economic.contextTypes = {
  router: React.PropTypes.func.isRequired
}

export default Economic;

import React from 'react';
import Utilities from './Utilities';
import Chart from './Chart';
import Map from './Map';
import SummaryStats from './SummaryStats';
import ChartLegend from './ChartLegend';
import NoData from './NoData';
import Loading from './Loading';

class Attributes extends React.Component {
  constructor(props) {
    super(props);
    this._update = this._update.bind(this);
    this.state = this._resetState();
    this.stateLookup = {
      'interval': {
        classifier: 'int_id',
        def: 'intervals'
      },
      'lithology': {
        classifier: 'lith_id',
        def: 'lithologies'
      },
      'lithology_type': {
        classifier: 'lith_type',
        def: 'lithologies'
      },
      'lithology_class': {
        classifier: 'lith_class',
        def: 'lithologies'
      },
      'environment': {
        classifier: 'environ_id',
        def: 'environments'
      },
      'environment_type': {
        classifier: 'environ_type',
        def: 'environments'
      },
      'environment': {
        classifier: 'environ_class',
        def: 'environments'
      },
      'economic': {
        classifier: 'econ_id',
        def: 'econs'
      },
      'economic_type': {
        classifier: 'econ_type',
        def: 'econs'
      },
      'economic_class': {
        classifier: 'econ_class',
        def: 'econs'
      }
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
      name: {
        name: '',
        id: '',
        url: ''
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

    Utilities.fetchMapData(`columns?${this.stateLookup[type].classifier}=${id}&response=long`, (error, data) => {
      Utilities.fetchData(`defs/${this.stateLookup[type].def}?${this.stateLookup[type].classifier}=${id}`, (defError, defData) => {
        if (error || defError || !data.features.length) {
          return this.setState(this._resetState());
        }

        var name;
        // Title is treated differently if it's a *_type or _class because it's a string instead of an integer
        if (isNaN(id)) {
          name = {
            name: id,
            id: id,
            url: '#/' + type + '/' + id
          }
        } else {
          name = {
            name: defData.success.data[0].name,
            id: defData.success.data[0][this.stateLookup[type].classifier],
            url: '#/' + type + '/' + defData.success.data[0][this.stateLookup[type].classifier]
          }
        }

        this.setState({
          name,
          type,
          id,
          liths: Utilities.parseAttributes('lith', Utilities.summarizeAttributes('lith', data.features)),
          environs: Utilities.parseAttributes('environ', Utilities.summarizeAttributes('environ', data.features)),
          econs: Utilities.parseAttributes('econ', Utilities.summarizeAttributes('econ', data.features)),
          summary: Utilities.summarize(data.features),
          properties: data.features[0].properties,
          mapData: data,
          loading: false
        });
      });
    });
  }

  componentDidMount() {
    var currentRoutes = this.context.router.getCurrentRoutes();
    var activeRoute = currentRoutes[currentRoutes.length - 1].name;

    this._update(activeRoute, this.props.params.id);
  }

  componentWillReceiveProps(nextProps) {
    var currentRoutes = this.context.router.getCurrentRoutes();
    var activeRoute = currentRoutes[currentRoutes.length - 1].name;
    // Only update if the URI actually changed
    if (nextProps.params.id !== this.props.params.id || activeRoute !== this.state.type) {
      this._update(activeRoute, nextProps.params.id);
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
        <Loading
          loading={this.state.loading}
        />
        <NoData
          features={this.state.mapData.features}
          type={'lithology'}
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

Attributes.contextTypes = {
  router: React.PropTypes.func.isRequired
}

export default Attributes;

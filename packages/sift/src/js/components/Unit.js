import React from 'react';
import Utilities from './Utilities';
import Chart from './Chart';
import Map from './Map';
import SummaryStats from './SummaryStats';
import ChartLegend from './ChartLegend';
import StratNameHierarchy from './StratNameHierarchy';
import NoData from './NoData';

class Unit extends React.Component {
  constructor(props) {
    super(props);
    this.state = this._resetState()
  }

  _resetState() {
    return {
      mapData: {features: [], _id: -1},
      liths: [],
      econs: [],
      environs: [],
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

  _update(id) {
    Utilities.fetchMapData(`columns?unit_id=${id}&response=long`, (error, data) => {
      Utilities.fetchData(`units?unit_id=${id}&response=long`, (unitError, unitData) => {
        if (error || unitError || unitData.success.data.length < 1) {
          return this.setState(this._resetState());
        }

        var attributes = unitData.success.data[0] || {};
        this.setState({
          liths: Utilities.parseAttributes('lith', attributes.lith),
          environs: Utilities.parseAttributes('environ', attributes.environ),
          econs: Utilities.parseAttributes('econ', attributes.econ),
          properties: attributes,
          mapData: data
        })
      });
    });
  }

  componentDidMount() {
    this._update(this.props.params.id);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.params.id !== this.props.params.id) {
      this._update(nextProps.params.id);
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
          {this.state.properties.unit_id ? <a href={'#/unit/' + this.state.properties.unit_id}>Unit {this.state.properties.unit_id} &mdash; {this.state.properties.unit_name}</a> : ''}
        </div>

        <NoData
          features={this.state.mapData.features}
          type={'unit'}
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

          <StratNameHierarchy
            stratNameID={this.state.properties.strat_name_id}
          />
        </div>
      </div>

    );

  }
}


export default Unit;

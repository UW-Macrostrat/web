import React from 'react';
import Config from './Config';
import Chart from './Chart';
import Utilities from './Utilities';
import Map from './Map';
import SummaryStats from './SummaryStats';
import ChartLegend from './ChartLegend';

class RandomColumn extends React.Component {
  constructor(props) {
    super(props);
    this.getRandom = this.getRandom.bind(this);
    this.state = {
      column: {},
      liths: [],
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

  getRandom(callback) {
    var RandomColumnID = Math.floor(Math.random() * (Config.totalColumns - 2) + 2) + 2;

    Utilities.fetchMapData(`columns?col_id=${RandomColumnID}&response=long&adjacents=true`, (error, data) => {
      if (error || data.features.length < 1) {
        return this.getRandom(callback);
      } else {
        callback(data);
      }
    });
  }

  componentDidMount() {
    this.getRandom(data => {
      this.setState({
        liths: Utilities.parseAttributes('lith',  data.features[0].properties.lith),
        column: data,
        properties: data.features[0].properties
      });
    });
  }

  render() {
    return (
      <div>

        <h3 className='title'>{this.state.properties.col_name}</h3>
        <div className='random-column'>
          <div className='random-column-stats'>
            <SummaryStats
              data={this.state.properties}
            />
            <div className='random-column-chart table-cell'>
              <div className='chart-container'>
                <div className='chart-position-adjustment'>
                  <Chart
                    title='Lithology'
                    id={'random-lith-chart'}
                    data={this.state.liths}
                  />
                </div>

                <div className='chart-legend'>
                  <ChartLegend
                    data={this.state.liths}
                  />
                </div>
              </div>
            </div>
          </div>
          <Map
            className='table-cell'
            data={this.state.column}
            target={true}
          />
        </div>
      </div>

    );
  }
}

export default RandomColumn;

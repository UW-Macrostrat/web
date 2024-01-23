import React from "react";
import Utilities from "./Utilities";

class Stats extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      stats: {
        columns: 0,
        packages: 0,
        units: 0,
        collections: 0,
      },
    };
  }

  componentWillMount() {
    Utilities.fetchData(`stats?all`, (error, data) => {
      var summary = {
        columns: 0,
        packages: 0,
        units: 0,
        collections: 0,
        measurements: 0,
      };
      data.success.data.forEach((d) => {
        summary.columns += d.columns;
        summary.packages += d.packages;
        summary.units += d.units;
        summary.collections += d.pbdb_collections;
        summary.measurements += d.measurements;
      });

      this.setState({ stats: summary });
    });
  }

  render() {
    return (
      <div className="main-stats">
        <table className="main-stats-table">
          <tr>
            <td className="main-stats-stat">
              {Utilities.addCommas(this.state.stats.columns)} columns
            </td>
            <td className="main-stats-stat">
              {Utilities.addCommas(this.state.stats.packages)} packages
            </td>
            <td className="main-stats-stat">
              {Utilities.addCommas(this.state.stats.units)} units
            </td>
            <td className="main-stats-stat">
              {Utilities.addCommas(this.state.stats.measurements)} measurements
            </td>
          </tr>
        </table>
      </div>
    );
  }
}

export default Stats;

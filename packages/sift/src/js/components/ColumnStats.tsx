import React from "react";
import Utilities from "./Utilities";

class ColumnStats extends React.Component {
  render() {
    return (
      <table className="random-column-stats-table table-cell">
        <tbody>
          <tr>
            <td>
              <span className="big-number">{this.props.data.t_sections}</span>{" "}
              packages
            </td>
          </tr>
          <tr>
            <td>
              <span className="big-number">{this.props.data.t_units}</span>{" "}
              units
            </td>
          </tr>
          <tr>
            <td>
              <span className="big-number">
                {parseInt(this.props.data.b_age)} -{" "}
                {parseInt(this.props.data.t_age)}
              </span>{" "}
              <small>Ma</small>
            </td>
          </tr>
          <tr>
            <td>
              <span className="big-number">
                {Utilities.addCommas(parseInt(this.props.data.col_area))}
              </span>{" "}
              <small>
                km<sup>2</sup>
              </small>
            </td>
          </tr>
          <tr>
            <td>
              <span className="big-number">
                {Utilities.addCommas(this.props.data.pbdb_collections)}
              </span>{" "}
              collections
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
}

export default ColumnStats;

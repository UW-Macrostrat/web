import React from "react";
import Utilities from "./Utilities";

class ColumnStats extends React.Component {
  render() {
    var thickness =
      this.props.data.max_thick === this.props.data.min_min_thick
        ? Utilities.addCommas(this.props.data.max_thick)
        : Utilities.addCommas(this.props.data.max_thick) +
          " - " +
          Utilities.addCommas(this.props.data.min_min_thick);
    return (
      <table className="random-column-stats-table table-cell">
        <tr className={this.props.data.t_sections ? "" : "hidden"}>
          <td>
            <span className="big-number">
              {Utilities.addCommas(this.props.data.t_sections)}
            </span>{" "}
            packages
          </td>
        </tr>
        <tr className={this.props.data.t_sections ? "" : "hidden"}>
          <td>
            <span className="big-number">
              {Utilities.addCommas(this.props.data.t_units)}
            </span>{" "}
            units
          </td>
        </tr>
        <tr>
          <td>
            <span className="summary-age">
              {this.props.data.b_int_name === this.props.data.t_int_name
                ? this.props.data.b_int_name
                : this.props.data.b_int_name +
                  " - " +
                  this.props.data.t_int_name}{" "}
            </span>
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
              &le; {Utilities.addCommas(this.props.data.max_thick)}
            </span>{" "}
            <small>m thick</small>
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
      </table>
    );
  }
}

export default ColumnStats;

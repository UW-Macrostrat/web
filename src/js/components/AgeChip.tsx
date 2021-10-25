import React, { Component } from "react";
import { hexToRgb } from "../utils";
/*
  Takes: b_int and t_int
*/
class AgeChip extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    let tIntChip = (
      <div
        className="age-chip age-chip-t-int"
        style={{ backgroundColor: hexToRgb(this.props.t_int.color, 0.8) }}
      >
        {this.props.t_int.int_name}
        {this.props.t_int.t_age ? (
          <div className="age-chip-age">
            {this.props.t_int.b_age}
            <span className="age-chip-ma">Ma</span>- {this.props.t_int.t_age}
            <span className="age-chip-ma">Ma</span>
          </div>
        ) : (
          ""
        )}
      </div>
    );

    return (
      <div className="age-chip-container">
        <div
          className="age-chip"
          style={{ backgroundColor: hexToRgb(this.props.b_int.color, 0.8) }}
        >
          {this.props.b_int.int_name || "Unknown"}
          {this.props.b_int.b_age ? (
            <div className="age-chip-age">
              {this.props.b_int.b_age}
              <span className="age-chip-ma">Ma</span> - {this.props.b_int.t_age}
              <span className="age-chip-ma">Ma</span>
            </div>
          ) : (
            ""
          )}
        </div>
        {this.props.b_int.int_id != this.props.t_int.int_id ? tIntChip : ""}
      </div>
    );
  }
}

export default AgeChip;

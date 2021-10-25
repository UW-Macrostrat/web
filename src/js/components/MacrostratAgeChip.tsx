import React, { Component } from "react";
import { hexToRgb } from "../utils";
/*
  Takes: b_int and t_int
*/
class MacrostratAgeChip extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    let age = this.props.b_int.int_name || "Unknown";
    if (this.props.t_int.int_name != age) {
      age += ` - ${this.props.t_int.int_name || "Unknown"}`;
    }
    return (
      <div className="age-chip-container">
        <div
          className="age-chip"
          style={{ backgroundColor: hexToRgb(this.props.color, 0.8) }}
        >
          {age}

          <div className="age-chip-age">
            {this.props.b_age}
            <span className="age-chip-ma">Ma</span> - {this.props.t_age}
            <span className="age-chip-ma">Ma</span>
          </div>
        </div>
      </div>
    );
  }
}

export default MacrostratAgeChip;

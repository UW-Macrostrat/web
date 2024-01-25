import React from "react";
import { SiftLink } from "./Link";

class StratColumnUnit extends React.Component {
  render() {
    return (
      <SiftLink to={"/unit/" + this.props.data.unit_id}>
        <div
          className="unit-box"
          style={{
            backgroundColor:
              "rgba(" +
              this.props.data.rgba.r +
              "," +
              this.props.data.rgba.g +
              "," +
              this.props.data.rgba.b +
              "," +
              this.props.data.rgba.alpha +
              ")",
            color: this.props.data.text_color,
          }}
        >
          {this.props.data.unit_name}{" "}
          {this.props.data.pbdb_collections > 0 ? (
            <img
              className={
                this.props.data.text_color === "#000000"
                  ? "hasFossils black"
                  : "hasFossils"
              }
              src="dist/img/noun_3167.png"
            />
          ) : (
            ""
          )}
        </div>
      </SiftLink>
    );
  }
}

export default StratColumnUnit;

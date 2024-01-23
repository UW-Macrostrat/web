import React from "react";
import Stats from "./Stats";
import RandomColumn from "./RandomColumn";
import IndexMap from "./IndexMap";
import Footer from "./Footer";

class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      refs: [],
    };
    this.updateRefs = this.updateRefs.bind(this);
  }

  updateRefs(refs) {
    this.setState({
      refs: this.state.refs.concat(refs),
    });
  }

  render() {
    var options = [
      78, 137, 144, 434, 468, 474, 486, 488, 521, 1472, 1643, 431, 301,
    ];
    var randomColID = options[Math.floor(Math.random() * (12 - 1) + 1) + 1];

    return (
      <div className="page-content">
        <div className="main">
          <div
            className="main-search"
            style={{ backgroundImage: "url(dist/img/" + randomColID + ".jpg)" }}
          >
            <div className="main-title">
              <div className="main-title-container">
                <h3>SIFT</h3>
                <p className="winnow">& winnow</p>
                <p className="macrostrat">MACROSTRAT</p>
              </div>
            </div>
          </div>
          <Stats />
          <RandomColumn colID={randomColID} />
          <IndexMap updateRefs={this.updateRefs} />
          <Footer data={this.state.refs} />
        </div>
      </div>
    );
  }
}

export default Main;

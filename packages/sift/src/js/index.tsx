import h from "@macrostrat/hyper";
import { createRoot } from "react-dom/client";
import { Route, Routes } from "react-router-dom";

import Attributes from "./components/Attributes";
import Column from "./components/Column";
import Definitions from "./components/Definitions";
import Explore from "./components/Explore";
import Main from "./components/Main";
import StratName from "./components/StratName";

import NoData from "./components/NoData";

// ReactRouter scroll behavior from 0.13
//scrollBehavior: Router.ScrollToTopBehavior,

function SiftRouter() {
  return (
    <Routes>
      <Route index path="" element={h(Main)} />
      <Route name="unit" path="unit/:id" element={h(Attributes)} />
      <Route
        name="column"
        path="column/:id"
        handler={Column}
        addHandlerKey={true}
      />
      <Route
        name="group"
        path="group/:id"
        handler={Attributes}
        addHandlerKey={true}
      />
      <Route name="interval" path="interval/:id" handler={Attributes} />

      <Route
        name="strat_name_concept"
        path="strat_name_concept/:id"
        handler={StratName}
      />
      <Route name="strat_name" path="strat_name/:id" handler={StratName} />

      <Route name="lithology" path="lithology/:id" handler={Attributes} />
      <Route
        name="lithology_type"
        path="lithology_type/:id"
        handler={Attributes}
      />
      <Route
        name="lithology_class"
        path="lithology_class/:id"
        handler={Attributes}
      />

      <Route name="environment" path="environment/:id" handler={Attributes} />
      <Route
        name="environment_type"
        path="environment_type/:id"
        handler={Attributes}
      />
      <Route
        name="environment_class"
        path="environment_class/:id"
        handler={Attributes}
      />

      <Route name="economic" path="economic/:id" handler={Attributes} />
      <Route
        name="economic_type"
        path="economic_type/:id"
        handler={Attributes}
      />
      <Route
        name="economic_class"
        path="economic_class/:id"
        handler={Attributes}
      />

      <Route
        name="definitions"
        path="definitions/:type"
        handler={Definitions}
      />

      <Route name="explore_bare" path="explore" handler={Explore} />
      <Route name="explore" path="explore/:x?" handler={Explore} />

      <NotFoundRoute handler={NoData} />
    </Routes>
  );
}

import React from "react";
import Autocomplete from "./Autocomplete";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      autocompleteIsOpen: false,
    };
    this.toggleAutocomplete = this.toggleAutocomplete.bind(this);
    this.finishAutocomplete = this.finishAutocomplete.bind(this);
  }

  toggleAutocomplete() {
    //  this.setState({
    //      autocompleteIsOpen: !this.state.autocompleteIsOpen
    //  });
  }

  finishAutocomplete(item) {
    if (item.id != 0) {
      window.location.hash =
        "#/" + this.props.categoryRouteLookup[item.dataset] + "/" + item.id;
    } else {
      window.location.hash =
        "#/" + this.props.categoryRouteLookup[item.dataset] + "/" + item.title;
    }
  }

  render() {
    return (
      <div className="container-fluid">
        <div
          className={
            this.state.autocompleteIsOpen ? "autocomplete-mask" : "hidden"
          }
        ></div>
        <div id="header">
          <div className="headerItem left">
            <a href="/">
              <img src="dist/img/logo_red.png" className="header-logo" />
            </a>
            <a href="#">
              <h3 className="header-title">SIFT</h3>
            </a>
          </div>
          <div className="headerItem right">
            <div className="autocomplete-wrapper">
              <Autocomplete
                minLength="2"
                reportState={this.toggleAutocomplete}
                onComplete={this.finishAutocomplete}
              />
            </div>
          </div>
        </div>

        <div>
          <RouteHandler />
        </div>
      </div>
    );
  }
}

App.defaultProps = {
  categoryLookup: {
    columns: "Columns",
    intervals: "Intervals",
    strat_name_concepts: "Stratigraphic Names",
    strat_name_orphans: "Other names",
    lithologies: "Lithologies",
    lithology_types: "Lithology Types",
    lithology_classes: "Lithology Classes",
    environments: "Environments",
    environment_types: "Environment Types",
    enviornment_classes: "Environment Classes",
    econs: "Economic",
    econ_types: "Economic Types",
    econ_classes: "Economic Classes",
    burwell: "Burwell",
    groups: "Groups",
  },
  categoryRoutes: {
    columns: "Columns",
    intervals: "Intervals",
    strat_name_concepts: "Stratigraphic Names",
    strat_name_orphans: "Other names",
    lithologies: "Lithologies",
    lithology_types: "Lithology Types",
    lithology_classes: "Lithology Classes",
    environments: "Environments",
    environment_types: "Environment Types",
    enviornment_classes: "Environment Classes",
    econs: "Economic",
    econ_types: "Economic Types",
    econ_classes: "Economic Classes",
    burwell: "Burwell",
    groups: "Groups",
  },
  categoryRouteLookup: {
    columns: "column",
    intervals: "interval",
    strat_name_concepts: "strat_name_concept",
    strat_name_orphans: "strat_name",
    lithologies: "lithology",
    lithology_types: "lithology_type",
    lithology_classes: "lithology_class",
    environments: "environment",
    environment_types: "environment_type",
    enviornment_classes: "environment_class",
    econs: "economic",
    econ_types: "economic_type",
    econ_classes: "economic_class",
  },
};

const container = document.getElementsByClassName("react")[0];
const root = createRoot(container);

root.render(<App />);

//ga("send", "pageview", document.location.href);

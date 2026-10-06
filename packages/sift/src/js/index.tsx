import h from "@macrostrat/hyper";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";

import Attributes from "./components/Attributes";
import Column from "./components/Column";
import Definitions from "./components/Definitions";
import Explore from "./components/Explore";
import Main from "./components/Main";
import StratName from "./components/StratName";

import NoData from "./components/NoData";

import React, { ReactNode } from "react";
import Autocomplete from "./components/Autocomplete";
import {
  SiftImage,
  SiftLink,
  siftPrefix,
  useSiftNavigate,
} from "./components/Link";

import "leaflet/dist/leaflet.css";
import "../css/styles.scss";

//import "../../dist/css/styles.min.css";

// ReactRouter scroll behavior from 0.13
//scrollBehavior: Router.ScrollToTopBehavior,

// Not sure if this is the correct way to deal with type errors
const _Routes = Routes as unknown as ReactNode;

function SiftRouter() {
  return (
    <_Routes>
      <Route index path="" element={h(Main)} />
      <Route name="unit" path="unit/:id" element={h(Attributes)} />
      <Route
        name="column"
        path="column/:id"
        element={h(Column)}
        addHandlerKey={true}
      />
      <Route
        name="group"
        path="group/:id"
        element={h(Attributes)}
        addHandlerKey={true}
      />
      <Route name="interval" path="interval/:id" element={h(Attributes)} />

      <Route
        name="strat_name_concept"
        path="strat_name_concept/:id"
        element={h(StratName)}
      />
      <Route name="strat_name" path="strat_name/:id" element={h(StratName)} />

      <Route name="lithology" path="lithology/:id" element={h(Attributes)} />
      <Route
        name="lithology_type"
        path="lithology_type/:id"
        element={h(Attributes)}
      />
      <Route
        name="lithology_class"
        path="lithology_class/:id"
        element={h(Attributes)}
      />

      <Route
        name="environment"
        path="environment/:id"
        element={h(Attributes)}
      />
      <Route
        name="environment_type"
        path="environment_type/:id"
        element={h(Attributes)}
      />
      <Route
        name="environment_class"
        path="environment_class/:id"
        element={h(Attributes)}
      />

      <Route name="economic" path="economic/:id" element={h(Attributes)} />
      <Route
        name="economic_type"
        path="economic_type/:id"
        element={h(Attributes)}
      />
      <Route
        name="economic_class"
        path="economic_class/:id"
        element={h(Attributes)}
      />

      <Route
        name="definitions"
        path="definitions/:type"
        element={h(Definitions)}
      />

      <Route name="explore_bare" path="explore" element={h(Explore)} />
      <Route name="explore" path="explore/:x?" element={h(Explore)} />

      <Route path="*" element={h(NoData)} />
    </_Routes>
  );
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      autocompleteIsOpen: false,
    };

    this.getNavigateURL = this.getNavigateURL.bind(this);
  }

  getNavigateURL(item) {
    let prefix = "/" + this.props.categoryRouteLookup[item.dataset] + "/";
    if (item.id != 0) {
      return prefix + item.id;
    } else {
      return prefix + item.title;
    }
  }

  render() {
    return (
      <BrowserRouter basename={siftPrefix}>
        <div className="container-fluid sift-root">
          <div
            className={
              this.state.autocompleteIsOpen ? "autocomplete-mask" : "hidden"
            }
          ></div>
          <div id="header">
            <div className="headerItem left">
              <a href="/">
                <SiftImage name="logo_red" className="header-logo" />
              </a>
              <SiftLink to="/">
                <h3 className="header-title">SIFT</h3>
              </SiftLink>
            </div>
            <div className="headerItem right">
              <TopBarAutocomplete
                minLength="2"
                getNavigateURL={this.getNavigateURL}
              />
            </div>
          </div>

          <div>
            <SiftRouter />
          </div>
        </div>
      </BrowserRouter>
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

function TopBarAutocomplete(props) {
  const navigate = useSiftNavigate();

  const finish = React.useCallback(
    (item) => {
      let url = props.getNavigateURL(item);
      console.log(url);
      navigate(url);
    },
    [navigate]
  );

  return (
    <div className="autocomplete-wrapper">
      <Autocomplete minLength="2" onComplete={finish} />
    </div>
  );
}

// const container = document.getElementsByClassName("react")[0];
// const root = createRoot(container);

// root.render(<App />);

//ga("send", "pageview", document.location.href);

const Sift = App;

export { Sift };

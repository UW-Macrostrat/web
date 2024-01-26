import h from "@macrostrat/hyper";
import async from "async";
import React from "react";
import { useMatch } from "react-router-dom";
import Chart from "./Chart";
import Footer from "./Footer";
import Loading from "./Loading";
import Map from "./Map";
import NoData from "./NoData";
import PrevalentTaxa from "./PrevalentTaxa";
import StratColumn from "./StratColumn";
import SummaryStats from "./SummaryStats";
import Utilities from "./Utilities";

class _Attributes extends React.Component {
  constructor(props) {
    super(props);
    this._update = this._update.bind(this);
    this.state = this._resetState();

    this.stateLookup = {
      column: {
        classifier: "col_id",
        def: "",
      },
      unit: {
        classifier: "unit_id",
        def: "",
      },
      group: {
        classifier: "col_group_id",
        def: "groups",
      },
      strat_name: {
        classifier: "strat_name_id",
        def: "",
      },
      strat_name_concept: {
        classifier: "concept_id",
        def: "",
      },
      interval: {
        classifier: "int_id",
        def: "intervals",
      },
      lithology: {
        classifier: "lith_id",
        def: "lithologies",
      },
      lithology_type: {
        classifier: "lith_type",
        def: "lithologies",
      },
      lithology_class: {
        classifier: "lith_class",
        def: "lithologies",
      },
      environment: {
        classifier: "environ_id",
        def: "environments",
      },
      environment_type: {
        classifier: "environ_type",
        def: "environments",
      },
      environment_class: {
        classifier: "environ_class",
        def: "environments",
      },
      economic: {
        classifier: "econ_id",
        def: "econs",
      },
      economic_type: {
        classifier: "econ_type",
        def: "econs",
      },
      economic_class: {
        classifier: "econ_class",
        def: "econs",
      },
    };
  }

  _resetState() {
    return {
      type: "",
      id: "",
      loading: false,
      mapData: { features: [], _id: -1 },
      fossils: { features: [], _id: -1 },
      prevalentTaxa: [{ oid: null, nam: "", img: null, noc: null }],
      strat_name_ids: [],
      units: [],
      liths: [],
      econs: [],
      environs: [],
      refs: [],
      name: {
        name: "",
        id: "",
        url: "",
      },
      summary: {
        col_area: "",
        max_thick: "",
        min_thick: "",
        b_age: "",
        t_age: "",
        pbdb_collections: "",
        t_units: "",
        t_sections: "",
      },
    };
  }

  setLegend(which, html) {
    document.getElementById(which + "-legend").innerHTML = html;
  }

  _update(type, id) {
    this.setState({
      loading: true,
    });
    /*
      - Get columns
      - if type === column, get units
      - if stateLookup[type].def.length, Get definitions
      - if strat_name or strat_name concept, get concept and hierarchy
      - Get fossils
        - if fossils, Get prevalent taxa
    */
    async.parallel(
      {
        columns: function (callback) {
          Utilities.fetchMapData(
            `columns?${this.stateLookup[type].classifier}=${id}&response=long` +
              (type === "column" ? "&adjacents=true" : ""),
            (error, data, refs) => {
              if (error) {
                return callback(error);
              }
              callback(null, { data, refs });
            }
          );
        }.bind(this),

        units: function (callback) {
          if (type === "column" || type === "unit") {
            Utilities.fetchData(
              `units?${this.stateLookup[type].classifier}=${id}&response=long`,
              (error, data) => {
                if (error) {
                  return callback(error);
                }
                callback(null, data.success.data);
              }
            );
          } else {
            callback(null, []);
          }
        }.bind(this),

        definitions: function (callback) {
          if (this.stateLookup[type].def.length) {
            Utilities.fetchData(
              `defs/${this.stateLookup[type].def}?${this.stateLookup[type].classifier}=${id}`,
              (error, data) => {
                if (error) {
                  return callback(error);
                }
                callback(null, data.success.data);
              }
            );
          } else {
            callback(null, []);
          }
        }.bind(this),

        strat_names: function (callback) {
          callback(null, []);
        }.bind(this),

        fossils: function (callback) {
          Utilities.fetchMapData(
            `fossils?${this.stateLookup[type].classifier}=${id}`,
            (error, data, refs) => {
              if (error) {
                return callback(error);
              }

              if (data == null) {
                data = { features: [] };
              }

              var collections = data.features.map((d) => {
                return d.properties.cltn_id;
              });

              if (collections.length) {
                Utilities.fetchPrevalentTaxa(
                  collections.join(","),
                  (prevalentError, prevalentData) => {
                    if (prevalentError) {
                      return callback(error);
                    }
                    // Normalize the names a bit
                    prevalentData.records.forEach((d) => {
                      var splitName = d.nam.split(" ");
                      d.nam = splitName[0] + (splitName.length > 1 ? "*" : "");
                    });

                    callback(null, {
                      data,
                      refs,
                      taxa: prevalentData.records,
                    });
                  }
                );
              } else {
                callback(null, {
                  data,
                  refs,
                  taxa: [{ oid: null, nam: "", img: null, noc: null }],
                });
              }
            }
          );
        }.bind(this),
      },
      function (error, data) {
        if (error) {
          // Make sure no data is shown
        }

        console.log(data);

        var name;
        // Title is treated differently if it's a *_type or _class because it's a string instead of an integer
        if (isNaN(id)) {
          name = {
            name: id,
            id: id,
            url: `/${type}/` + id,
          };
        } else if (this.stateLookup[type].def.length) {
          name = {
            name: data.definitions[0].name,
            id: data.definitions[0][this.stateLookup[type].classifier],
            url:
              `/${type}/` +
              data.definitions[0][this.stateLookup[type].classifier],
          };
        } else if (type === "column") {
          name = {
            name: data.columns.data.features[0].properties.col_name,
            id: data.columns.data.features[0].properties.col_id,
            url: "/column/" + data.columns.data.features[0].properties.col_id,
          };
        } else if (type === "unit") {
          name = {
            name:
              "Unit " + data.units[0].unit_id + " - " + data.units[0].unit_name,
            id: data.units[0].unit_id,
            url: "/unit/" + data.units[0].unit_id,
          };
        }

        console.log("Name - ", name);

        this.setState({
          type,
          id,
          name,
          units: data.units,
          fossils: data.fossils.data,
          strat_name_ids: data.units
            .map((d) => {
              return d.strat_name_id;
            })
            .filter((d) => {
              if (d) {
                return d;
              }
            }),
          liths: Utilities.parseAttributes(
            "lith",
            Utilities.summarizeAttributes("lith", data.columns.data.features)
          ),
          environs: Utilities.parseAttributes(
            "environ",
            Utilities.summarizeAttributes("environ", data.columns.data.features)
          ),
          econs: Utilities.parseAttributes(
            "econ",
            Utilities.summarizeAttributes("econ", data.columns.data.features)
          ),
          summary: Utilities.summarize(data.columns.data.features),
          prevalentTaxa: data.fossils.taxa,
          mapData: data.columns.data,
          refs: Object.keys(data.columns.refs)
            .map((ref) => {
              return data.columns.refs[ref];
            })
            .concat(
              Object.keys(data.fossils.refs ?? {}).map((ref) => {
                return data.fossils.refs[ref];
              })
            ),
          loading: false,
        });
      }.bind(this)
    );
  }

  componentDidMount() {
    var activeRoute = this.props.params.type;
    console.log("Active route", activeRoute);
    this._update(activeRoute, this.props.params.id);
  }

  componentWillReceiveProps(nextProps) {
    var activeRoute = nextProps.params.type;
    // Only update if the URI actually changed
    if (
      nextProps.params.id !== this.props.params.id ||
      activeRoute !== this.state.type
    ) {
      this._update(activeRoute, nextProps.params.id);
    }
  }

  render() {
    var lithChart;
    var environChart;
    var econChart;
    var totalCharts = 0;
    if (this.state.econs.length) {
      totalCharts += 1;
      econChart = (
        <div>
          <Chart
            title="Economic"
            id={"column-econ-chart"}
            data={this.state.econs}
            shareLegend={this.setLegend}
            returnLegend={true}
          />
          <div id="column-econ-chart-legend"></div>
        </div>
      );
    }

    if (this.state.liths.length) {
      totalCharts += 1;
      lithChart = (
        <div>
          <Chart
            title="Lithology"
            id={"column-lith-chart"}
            data={this.state.liths}
            shareLegend={this.setLegend}
            returnLegend={true}
          />
          <div id="column-lith-chart-legend"></div>
        </div>
      );
    }

    if (this.state.environs.length) {
      totalCharts += 1;
      environChart = (
        <div>
          <Chart
            title="Environment"
            id={"column-environ-chart"}
            data={this.state.environs}
            shareLegend={this.setLegend}
            returnLegend={true}
          />
          <div id="column-environ-chart-legend"></div>
        </div>
      );
    }

    return (
      <div className="page-content">
        <Loading loading={this.state.loading} />
        <NoData
          features={this.state.mapData.features}
          type={"lithology"}
          loading={this.state.loading}
        />

        <div className={this.state.mapData.features.length ? "" : "hidden"}>
          <div className="page-title">
            <a href={this.state.name.url}>{this.state.name.name}</a>
          </div>
          <div className="random-column">
            <div className="random-column-stats">
              <SummaryStats data={this.state.summary} />
            </div>
            <Map
              className="table-cell"
              data={this.state.mapData}
              target={this.state.type === "column" ? true : false}
              fossils={this.state.fossils}
            />
          </div>

          <div className="row chart-row">
            <div className={"col-sm-" + 12 / totalCharts}>{lithChart}</div>
            <div className={"col-sm-" + 12 / totalCharts}>{environChart}</div>
            <div className={"col-sm-" + 12 / totalCharts}>{econChart}</div>
          </div>

          <PrevalentTaxa data={this.state.prevalentTaxa} />

          <StratColumn data={this.state.units} />
        </div>
        <Footer data={this.state.refs} loading={this.state.loading} />
      </div>
    );
  }
}

function Attributes(props) {
  const { params } = useMatch("/:type/:id");
  return h(_Attributes, { ...props, params });
}

// Attributes.contextTypes = {
//   router: React.PropTypes.func.isRequired,
// };

export default Attributes;

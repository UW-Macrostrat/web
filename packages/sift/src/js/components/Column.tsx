import h from "@macrostrat/hyper";
import React from "react";
import { Link, useParams } from "react-router-dom";
import Chart from "./Chart";
import Footer from "./Footer";
import { SiftLink } from "./Link";
import Loading from "./Loading";
import Map from "./Map";
import NoData from "./NoData";
import PrevalentTaxa from "./PrevalentTaxa";
import StratColumn from "./StratColumn";
import SummaryStats from "./SummaryStats";
import Utilities from "./Utilities";

class _Column extends React.Component {
  constructor(props) {
    super(props);
    this.state = this._resetState();
  }

  _resetState() {
    return {
      loading: false,
      mapData: { features: [], _id: -1 },
      fossils: { features: [], _id: -1 },
      prevalentTaxa: [{ oid: null, nam: "", img: null, noc: null }],
      units: [],
      column: {},
      liths: [],
      econs: [],
      environs: [],
      strat_name_ids: [],
      cltn_ids: [],
      refs: [],
      properties: {
        col_id: "",
        col_name: "",
        col_group: "",
        col_group_id: "",
        group_col_id: "",
        col_area: "",
        project_id: "",
        max_thick: "",
        min_thick: "",
        b_age: "",
        t_age: "",
        pbdb_collections: "",
        lith: [],
        environ: [],
        econ: [],
        t_units: "",
        t_sections: "",
      },
    };
  }

  setLegend(which, html) {
    document.getElementById(which + "-legend").innerHTML = html;
  }

  _update(id) {
    this.setState({
      loading: true,
    });
    Utilities.fetchMapData(
      `columns?col_id=${id}&response=long&adjacents=true`,
      (error, data, refs) => {
        Utilities.fetchData(
          `units?col_id=${id}&response=long`,
          (unitError, unitData) => {
            if (error || unitError || !data.features.length) {
              return this.setState(this._resetState());
            }
            Utilities.fetchMapData(
              `fossils?col_id=${id}`,
              (fossilError, fossilData, fossilRefs) => {
                if (fossilError) {
                  return console.log("Error fetching fossils ", error);
                }
                if (fossilData == null) {
                  return;
                }

                this.setState({
                  fossils: fossilData,
                  cltn_ids: fossilData.features.map((d) => {
                    return d.properties.cltn_id;
                  }),
                });

                var collections = fossilData.features.map((d) => {
                  return d.properties.cltn_id;
                });

                if (collections.length) {
                  Utilities.fetchPrevalentTaxa(
                    collections.join(","),
                    (prevalentError, prevalentData) => {
                      if (prevalentError) {
                        return;
                      }
                      // Normalize the names a bit
                      prevalentData.records.forEach((d) => {
                        var splitName = d.nam.split(" ");
                        d.nam =
                          splitName[0] + (splitName.length > 1 ? "*" : "");
                      });

                      this.setState({
                        prevalentTaxa: prevalentData.records,
                        refs: this.state.refs.concat(
                          Object.keys(fossilRefs).map((d) => {
                            return fossilRefs[d];
                          })
                        ),
                      });
                    }
                  );
                } else {
                  this.setState({
                    prevalentTaxa: [
                      { oid: null, nam: "", img: null, noc: null },
                    ],
                    refs: this.state.refs.concat(
                      Object.keys(fossilRefs).map((d) => {
                        return fossilRefs[d];
                      })
                    ),
                  });
                }
              }
            );

            this.setState({
              units: unitData.success.data,
              liths: Utilities.parseAttributes(
                "lith",
                data.features[0].properties.lith
              ),
              environs: Utilities.parseAttributes(
                "environ",
                data.features[0].properties.environ
              ),
              econs: Utilities.parseAttributes(
                "econ",
                data.features[0].properties.econ
              ),
              strat_name_ids: unitData.success.data
                .map((d) => {
                  return d.strat_name_id;
                })
                .filter((d) => {
                  if (d) {
                    return d;
                  }
                }),
              mapData: data,
              outcropData: { features: [], _id: -1 },
              properties: data.features[0].properties,
              loading: false,
              refs: Object.keys(refs).map((d) => {
                return refs[d];
              }),
            });
          }
        );
      }
    );
  }

  componentDidMount() {
    this._update(this.props.params.id);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.params.id !== this.props.params.id) {
      this._update(nextProps.params.id);
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
        <div className="page-title">
          {this.state.properties.col_id ? (
            <p>
              <SiftLink to={"/column/" + this.state.properties.col_id}>
                {this.state.properties.col_name}{" "}
              </SiftLink>
              <small>
                <SiftLink to={"/group/" + this.state.properties.col_group_id}>
                  ({this.state.properties.col_group}{" "}
                  {this.state.properties.group_col_id})
                </SiftLink>
              </small>
            </p>
          ) : (
            ""
          )}
        </div>

        <Loading loading={this.state.loading} />

        <NoData
          features={this.state.mapData.features}
          type={"column"}
          loading={this.state.loading}
        />

        <div className={this.state.mapData.features.length ? "" : "hidden"}>
          <div className="random-column">
            <div className="random-column-stats">
              <SummaryStats data={this.state.properties} />
            </div>

            <Map
              className="table-cell"
              data={this.state.mapData}
              fossils={this.state.fossils}
              stratNameIDs={this.state.strat_name_ids}
              target={true}
              updateRefs={this.updateRefs}
            />
          </div>

          <div className="row chart-row">
            <div className={"col-sm-" + 12 / totalCharts}>{lithChart}</div>
            <div className={"col-sm-" + 12 / totalCharts}>{environChart}</div>
            <div className={"col-sm-" + 12 / totalCharts}>{econChart}</div>
          </div>

          <PrevalentTaxa data={this.state.prevalentTaxa} />

          <StratColumn data={this.state.units} />
          <Link
            to={"/column/" + this.state.properties.col_id}
            target="_blank"
            className="normalize-link alternate-column"
          >
            Alternate column view
          </Link>
        </div>

        <Footer data={this.state.refs} />
      </div>
    );
  }
}

function Column(props) {
  const params = useParams();
  return h(_Column, { ...props, params });
}

// Column.contextTypes = {
//   router: React.PropTypes.func.isRequired,
// };

export default Column;

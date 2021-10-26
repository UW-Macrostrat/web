import React, { Component } from "react";
import {
  Icon,
  IconNames,
  Card,
  Alignment,
  Navbar,
  Button,
  Overlay,
  Dialog,
  Classes,
} from "@blueprintjs/core";

import CircularProgress from "@material-ui/core/CircularProgress";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import { connect } from "react-redux";
import {
  closeInfoDrawer,
  expandInfoDrawer,
  getColumn,
  getGdd,
} from "../../actions";

// Icons
import CloseIcon from "@material-ui/icons/Close";
import IconButton from "@material-ui/core/IconButton";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import Typography from "@material-ui/core/Typography";

// Our components
import AgeChip from "../AgeChip";
import MacrostratAgeChip from "../MacrostratAgeChip";
import LithChip from "../LithChip";
import AttrChip from "../AttrChip";
import Reference from "../Reference";
import MapSource from "../MapSource";
import LongText from "../LongText";
import PBDBCollections from "../PBDBCollections";
import Journal from "../gdd/Journal";

import {
  ExpansionPanel,
  ExpansionPanelSummary,
  ExpansionPanelDetails,
} from "../ExpansionPanel";
import { addCommas, normalizeLng } from "../../utils";

let Divider = (props) => <div className="whitespace-divider" />;

class InfoDrawer extends Component {
  constructor(props) {
    super(props);
    // Need to run this when drawer is opened
    this.state = {
      expanded: null,
      bedrockExpanded: this.props.mapHasBedrock,
      bedrockMatchExpanded: this.props.mapHasBedrock,
      stratigraphyExpanded: this.props.mapHasColumns,
      pbdbExpanded: this.props.mapHasFossils,
      gddExpanded: false,
    };

    this.handleChange = (panel) => (event, expanded) => {
      this.setState({
        expanded: expanded ? panel : false,
      });
    };
    this.collapse = (panel) => (event) => {
      if (panel === "bedrock") {
        this.setState({
          bedrockExpanded: !this.state.bedrockExpanded,
        });
      } else if (panel === "bedrockMatch") {
        this.setState({
          bedrockMatchExpanded: !this.state.bedrockMatchExpanded,
        });
      } else if (panel === "stratigraphy") {
        this.setState({
          stratigraphyExpanded: !this.state.stratigraphyExpanded,
        });
        // if (!this.state.stratigraphyExpanded) {
        //   console.log('get column!')
        //   this.props.getColumn()
        // }
      } else if (panel === "pbdb") {
        this.setState({
          pbdbExpanded: !this.state.pbdbExpanded,
        });
      } else if (panel === "gdd") {
        if (!this.state.gddExpanded) {
          this.openGdd();
        }
        this.setState({
          gddExpanded: !this.state.gddExpanded,
        });
      }
    };
  }

  openGdd() {
    this.props.getGdd();
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      bedrockExpanded: nextProps.mapHasBedrock,
      bedrockMatchExpanded: nextProps.mapHasBedrock,
    });

    if (nextProps.mapHasColumns != this.props.mapHasColumns) {
      this.setState({
        stratigraphyExpanded: nextProps.mapHasColumns,
      });
      //  this.props.getColumn()
    }

    // Reset the state when the drawer is closed
    if (
      nextProps.infoDrawerOpen === false &&
      this.props.infoDrawerOpen === true
    ) {
      this.setState({
        bedrockExpanded: nextProps.mapHasBedrock,
        bedrockMatchExpanded: nextProps.mapHasBedrock,
        stratigraphyExpanded: nextProps.mapHasColumns,
        pbdbExpanded: nextProps.mapHasFossils,
        gddExpanded: false,
      });
    }
  }

  render() {
    const {
      infoDrawerOpen,
      closeInfoDrawer,
      expandInfoDrawer,
      infoDrawerExpanded,
    } = this.props;
    let { mapInfo, gddInfo, pbdbData } = this.props;

    const {
      expanded,
      bedrockExpanded,
      bedrockMatchExpanded,
      stratigraphyExpanded,
      pbdbExpanded,
      gddExpanded,
    } = this.state;

    const expansionPanelClasses = {
      content: "expansion-panel",
      root: "expansion-panel-root",
    };
    const expansionPanelDetailClasses = {
      root: "expansion-panel-detail",
    };
    const expansionPanelDetailSubClasses = {
      root: "expansion-panel-detail-sub",
    };

    const exitTransition = {
      exit: 1000,
    };

    if (!mapInfo || !mapInfo.mapData) {
      mapInfo = {
        mapData: [],
      };
    }

    let height = this.props.infoDrawerExpanded ? "auto" : "0";
    let source =
      mapInfo && mapInfo.mapData && mapInfo.mapData.length
        ? mapInfo.mapData[0]
        : {
            name: null,
            descrip: null,
            comments: null,
            liths: [],
            b_int: {},
            t_int: {},
            ref: {},
          };

    let infoDrawerHeader = (
      <div className="infodrawer-header">
        {mapInfo.elevation ? (
          <div className="infodrawer-header-item lnglat-container">
            <span className="lnglat">
              {normalizeLng(this.props.infoMarkerLng)}{" "}
              {this.props.infoMarkerLat}
            </span>
            <span className="z">
              {mapInfo.elevation}
              <span className="age-chip-ma">m</span> |{" "}
              {(mapInfo.elevation * 3.28084).toFixed(0)}
              <span className="age-chip-ma">ft</span>
            </span>
          </div>
        ) : (
          ""
        )}
      </div>
    );

    if (!infoDrawerOpen) {
      return null;
    }

    return (
      <div className="infodrawer-container">
        <Card className="infodrawer">
          <header>
            <div>
              <Icon icon="map-marker" />
              {infoDrawerHeader}
            </div>
            <Button minimal icon="cross" onClick={closeInfoDrawer} />
          </header>
          <div>
            <div
              className={
                this.props.fetchingMapInfo ? "infoDrawer-loading" : "hidden"
              }
            >
              <CircularProgress size={50} />
            </div>
            <div className={this.props.fetchingMapInfo ? "hidden" : "d"}>
              {pbdbData && pbdbData.length > 0 ? (
                <span>
                  <ExpansionPanel
                    classes={{ root: "regional-panel" }}
                    onChange={this.collapse("pbdb")}
                    expanded={pbdbExpanded}
                  >
                    <ExpansionPanelSummary
                      expandIcon={<ExpandMoreIcon />}
                      classes={expansionPanelClasses}
                    >
                      <Typography className="expansion-summary-title">
                        Fossil Collections{" "}
                        <span className="via-gdd">via PBDB</span>{" "}
                      </Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails
                      classes={expansionPanelDetailClasses}
                    >
                      <PBDBCollections data={pbdbData} />
                    </ExpansionPanelDetails>
                  </ExpansionPanel>
                </span>
              ) : (
                ""
              )}

              {mapInfo && mapInfo.mapData && mapInfo.mapData.length ? (
                <span>
                  <ExpansionPanel
                    classes={{ root: "regional-panel" }}
                    onChange={this.collapse("bedrock")}
                    expanded={bedrockExpanded}
                  >
                    <ExpansionPanelSummary
                      expandIcon={<ExpandMoreIcon />}
                      classes={expansionPanelClasses}
                    >
                      <Typography className="expansion-summary-title">
                        Geologic map{" "}
                        <span className="via-gdd">
                          via providers, Macrostrat
                        </span>{" "}
                      </Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails
                      classes={expansionPanelDetailClasses}
                    >
                      <div className="map-source-attrs">
                        {source.name && source.name.length ? (
                          <div className="map-source-attr">
                            <span className="attr">Name: </span> {source.name}
                          </div>
                        ) : (
                          ""
                        )}
                        {source.age && source.age.length ? (
                          <div className="map-source-attr">
                            <span className="attr">Age: </span> {source.age} (
                            {source.b_int.b_age} - {source.t_int.t_age}
                            <span className="age-chip-ma">Ma</span>)
                          </div>
                        ) : (
                          ""
                        )}
                        {source.strat_name && source.strat_name.length ? (
                          <LongText
                            name="Stratigraphic name(s)"
                            text={source.strat_name}
                          />
                        ) : (
                          ""
                        )}
                        {source.lith && source.lith.length ? (
                          <LongText name="Lithology" text={source.lith} />
                        ) : (
                          ""
                        )}
                        {source.descrip && source.descrip.length ? (
                          <LongText name="Description" text={source.descrip} />
                        ) : (
                          ""
                        )}
                        {source.comments && source.comments.length ? (
                          <LongText name="Comments" text={source.comments} />
                        ) : (
                          ""
                        )}
                        {source.lines && source.lines.length ? (
                          <div className="map-source-attr">
                            <span className="attr">Lines: </span>
                            {source.lines.map((line, idx) => {
                              return (
                                <div className="map-source-line" key={idx}>
                                  {line.name ? (
                                    <span className="line-attr">
                                      <span className="attr">Name: </span>{" "}
                                      {line.name}
                                    </span>
                                  ) : (
                                    ""
                                  )}
                                  {line.type ? (
                                    <span className="line-attr">
                                      <span className="attr">Type: </span>{" "}
                                      {line.type}
                                    </span>
                                  ) : (
                                    ""
                                  )}
                                  {line.direction ? (
                                    <span className="line-attr">
                                      <span className="attr">Direction: </span>{" "}
                                      {line.direction}
                                    </span>
                                  ) : (
                                    ""
                                  )}
                                  {line.descrip ? (
                                    <span className="line-attr">
                                      <span className="attr">
                                        Description:{" "}
                                      </span>{" "}
                                      {line.descrip}
                                    </span>
                                  ) : (
                                    ""
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          ""
                        )}
                        <Reference reference={source.ref} />
                      </div>
                    </ExpansionPanelDetails>
                  </ExpansionPanel>
                </span>
              ) : (
                ""
              )}

              {mapInfo && mapInfo.mapData && mapInfo.mapData.length ? (
                <span>
                  <Divider />
                  <ExpansionPanel
                    classes={{ root: "regional-panel" }}
                    onChange={this.collapse("bedrockMatch")}
                    expanded={bedrockMatchExpanded}
                  >
                    <ExpansionPanelSummary
                      expandIcon={<ExpandMoreIcon />}
                      classes={expansionPanelClasses}
                    >
                      <Typography className="expansion-summary-title">
                        Macrostrat-linked data{" "}
                        <span className="via-gdd">via Macrostrat</span>{" "}
                      </Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails
                      classes={expansionPanelDetailClasses}
                    >
                      {mapInfo &&
                      mapInfo.mapData &&
                      mapInfo.mapData.length &&
                      (!source.macrostrat ||
                        Object.keys(source.macrostrat).length === 0) ? (
                        <AgeChip
                          b_int={mapInfo.mapData[0].b_int}
                          t_int={mapInfo.mapData[0].t_int}
                        ></AgeChip>
                      ) : (
                        ""
                      )}
                      {source.macrostrat && source.macrostrat.b_age ? (
                        <ExpansionPanel>
                          <ExpansionPanelSummary
                            classes={expansionPanelClasses}
                          >
                            <Typography className="expansion-summary-title">
                              Age:{" "}
                            </Typography>
                            <MacrostratAgeChip
                              b_int={source.macrostrat.b_int}
                              t_int={source.macrostrat.t_int}
                              b_age={source.macrostrat.b_age}
                              t_age={source.macrostrat.t_age}
                              color={source.color}
                            />
                          </ExpansionPanelSummary>
                        </ExpansionPanel>
                      ) : (
                        ""
                      )}

                      {source.macrostrat && source.macrostrat.strat_names ? (
                        <ExpansionPanel
                          expanded={expanded === "strat_names"}
                          onChange={this.handleChange("strat_names")}
                        >
                          <ExpansionPanelSummary
                            expandIcon={<ExpandMoreIcon />}
                            classes={expansionPanelClasses}
                          >
                            <Typography className="expansion-summary-title">
                              Match basis:{" "}
                            </Typography>
                            {source.macrostrat.strat_names[0].rank_name}
                            {source.macrostrat.strat_names.length > 1
                              ? "..."
                              : ""}
                          </ExpansionPanelSummary>
                          <ExpansionPanelDetails
                            classes={expansionPanelDetailSubClasses}
                          >
                            <p className="expansion-panel-detail-header">
                              All matched names:
                            </p>
                            <Divider />
                            {source.macrostrat.strat_names.map((name, i) => {
                              if (
                                i !=
                                source.macrostrat.strat_names.length - 1
                              ) {
                                return (
                                  <span key={i}>
                                    <a
                                      className="externalLink"
                                      href={
                                        "https://macrostrat.org/sift/#/strat_name/" +
                                        name.strat_name_id
                                      }
                                      key={i}
                                    >
                                      {name.rank_name}
                                    </a>
                                    ,{" "}
                                  </span>
                                );
                              } else {
                                return (
                                  <span key={i}>
                                    <a
                                      className="externalLink"
                                      href={
                                        "https://macrostrat.org/sift/#/strat_name/" +
                                        name.strat_name_id
                                      }
                                      key={i}
                                    >
                                      {name.rank_name}
                                    </a>
                                  </span>
                                );
                              }
                            })}
                          </ExpansionPanelDetails>
                        </ExpansionPanel>
                      ) : (
                        ""
                      )}

                      {source.macrostrat && source.macrostrat.max_thick ? (
                        <ExpansionPanel>
                          <ExpansionPanelSummary
                            classes={expansionPanelClasses}
                          >
                            <Typography className="expansion-summary-title">
                              Thickness:{" "}
                            </Typography>
                            <Typography className="expansion-summary-detail">
                              {source.macrostrat.min_min_thick} -{" "}
                              {source.macrostrat.max_thick}
                              <span className="age-chip-ma">m</span>
                            </Typography>
                          </ExpansionPanelSummary>
                        </ExpansionPanel>
                      ) : (
                        ""
                      )}

                      {source.macrostrat &&
                      source.macrostrat.pbdb_collections ? (
                        <ExpansionPanel
                          expanded={expanded === "fossil_collections"}
                          onChange={this.handleChange("fossil_collections")}
                        >
                          <ExpansionPanelSummary
                            classes={expansionPanelClasses}
                          >
                            <Typography className="expansion-summary-title">
                              Fossil collections:{" "}
                            </Typography>
                            <Typography className="expansion-summary-detail">
                              {source.macrostrat.pbdb_collections}
                            </Typography>
                          </ExpansionPanelSummary>
                        </ExpansionPanel>
                      ) : (
                        ""
                      )}
                      {source.macrostrat && source.macrostrat.pbdb_occs ? (
                        <ExpansionPanel
                          expanded={expanded === "fossil_occs"}
                          onChange={this.handleChange("fossil_occs")}
                        >
                          <ExpansionPanelSummary
                            classes={expansionPanelClasses}
                          >
                            <Typography className="expansion-summary-title">
                              Fossil occurrences:{" "}
                            </Typography>
                            <Typography className="expansion-summary-detail">
                              {source.macrostrat.pbdb_occs}
                            </Typography>
                          </ExpansionPanelSummary>
                        </ExpansionPanel>
                      ) : (
                        ""
                      )}

                      {source.macrostrat &&
                      source.macrostrat.liths &&
                      source.macrostrat.liths.length ? (
                        <ExpansionPanel
                          expanded={expanded === "lithology"}
                          onChange={this.handleChange("lithology")}
                        >
                          <ExpansionPanelSummary
                            expandIcon={<ExpandMoreIcon />}
                            classes={expansionPanelClasses}
                          >
                            <Typography className="expansion-summary-title">
                              Lithology:{" "}
                            </Typography>
                            {source.macrostrat && source.macrostrat.lith_classes
                              ? source.macrostrat.lith_classes.map(
                                  (lithClass, i) => {
                                    return (
                                      <AttrChip
                                        key={i}
                                        name={lithClass.name}
                                        color={lithClass.color}
                                      />
                                    );
                                  }
                                )
                              : ""}
                          </ExpansionPanelSummary>
                          <ExpansionPanelDetails
                            classes={expansionPanelDetailSubClasses}
                          >
                            <p className="expansion-panel-detail-header">
                              Matched lithologies:
                            </p>
                            <Divider />
                            {source.macrostrat.liths.map((lith, i) => {
                              return (
                                <AttrChip
                                  key={i}
                                  name={lith.lith}
                                  color={lith.color}
                                  fill={lith.lith_fill}
                                />
                              );
                            })}
                          </ExpansionPanelDetails>
                        </ExpansionPanel>
                      ) : (
                        ""
                      )}

                      {source.macrostrat &&
                      source.macrostrat.environs &&
                      source.macrostrat.environs.length ? (
                        <ExpansionPanel
                          expanded={expanded === "environment"}
                          onChange={this.handleChange("environment")}
                        >
                          <ExpansionPanelSummary
                            expandIcon={<ExpandMoreIcon />}
                            classes={expansionPanelClasses}
                          >
                            <Typography className="expansion-summary-title">
                              Environment:{" "}
                            </Typography>
                            {source.macrostrat &&
                            source.macrostrat.environ_classes
                              ? source.macrostrat.environ_classes.map(
                                  (environClass, i) => {
                                    return (
                                      <AttrChip
                                        key={i}
                                        name={environClass.name}
                                        color={environClass.color}
                                      />
                                    );
                                  }
                                )
                              : ""}
                          </ExpansionPanelSummary>
                          <ExpansionPanelDetails
                            classes={expansionPanelDetailSubClasses}
                          >
                            <p className="expansion-panel-detail-header">
                              Matched environments:
                            </p>
                            <Divider />
                            {source.macrostrat.environs.map((environ, i) => {
                              return (
                                <AttrChip
                                  key={i}
                                  name={environ.environ}
                                  color={environ.color}
                                />
                              );
                            })}
                          </ExpansionPanelDetails>
                        </ExpansionPanel>
                      ) : (
                        ""
                      )}

                      {source.macrostrat &&
                      source.macrostrat.econs &&
                      source.macrostrat.econs.length ? (
                        <ExpansionPanel
                          expanded={expanded === "economy"}
                          onChange={this.handleChange("economy")}
                        >
                          <ExpansionPanelSummary
                            expandIcon={<ExpandMoreIcon />}
                            classes={expansionPanelClasses}
                          >
                            <Typography className="expansion-summary-title">
                              Economy:{" "}
                            </Typography>
                            {source.macrostrat && source.macrostrat.econ_classes
                              ? source.macrostrat.econ_classes.map(
                                  (econClass, i) => {
                                    return (
                                      <AttrChip
                                        key={i}
                                        name={econClass.name}
                                        color={econClass.color}
                                      />
                                    );
                                  }
                                )
                              : ""}
                          </ExpansionPanelSummary>
                          <ExpansionPanelDetails
                            classes={expansionPanelDetailSubClasses}
                          >
                            <p className="expansion-panel-detail-header">
                              Matched economic attributes:
                            </p>
                            <Divider />
                            {source.macrostrat.econs.map((econ, i) => {
                              return (
                                <AttrChip
                                  key={i}
                                  name={econ.econ}
                                  color={econ.color}
                                />
                              );
                            })}
                          </ExpansionPanelDetails>
                        </ExpansionPanel>
                      ) : (
                        ""
                      )}
                    </ExpansionPanelDetails>
                  </ExpansionPanel>
                </span>
              ) : (
                ""
              )}

              {mapInfo && mapInfo.mapData && mapInfo.hasColumns ? (
                <span>
                  <Divider />
                  <ExpansionPanel
                    classes={{ root: "regional-panel" }}
                    onChange={this.collapse("stratigraphy")}
                    expanded={stratigraphyExpanded}
                  >
                    <ExpansionPanelSummary
                      expandIcon={<ExpandMoreIcon />}
                      classes={expansionPanelClasses}
                    >
                      <Typography className="expansion-summary-title">
                        Regional stratigraphy{" "}
                      </Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails
                      classes={expansionPanelDetailClasses}
                    >
                      {Object.keys(this.props.columnInfo).length != 0 ? (
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell>
                                <Typography className="expansion-summary-title">
                                  Thickness:
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {addCommas(
                                  parseInt(this.props.columnInfo.min_thick)
                                )}{" "}
                                -{" "}
                                {addCommas(
                                  parseInt(this.props.columnInfo.max_thick)
                                )}{" "}
                                <span className="age-chip-ma">m</span>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>
                                <Typography className="expansion-summary-title">
                                  Age:
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {this.props.columnInfo.b_age} -{" "}
                                {this.props.columnInfo.t_age}{" "}
                                <span className="age-chip-ma">Ma</span>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>
                                <Typography className="expansion-summary-title">
                                  Area:
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {addCommas(this.props.columnInfo.area)}{" "}
                                <span className="age-chip-ma">km2</span>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>
                                <Typography className="expansion-summary-title">
                                  Fossil collections:
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {addCommas(
                                  this.props.columnInfo.pbdb_collections
                                )}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>
                                <Typography className="expansion-summary-title">
                                  Fossil occurrences:
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {addCommas(this.props.columnInfo.pbdb_occs)}
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>
                                <table>
                                  <tbody>
                                    <tr>
                                      <td>Period</td>
                                      <td>Unit</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      ) : (
                        ""
                      )}
                    </ExpansionPanelDetails>
                  </ExpansionPanel>
                </span>
              ) : (
                ""
              )}

              {mapInfo.regions && mapInfo.regions.length ? (
                <ExpansionPanel classes={{ root: "regional-panel" }}>
                  <ExpansionPanelSummary>
                    <Typography className="expansion-summary-title">
                      Physiography{" "}
                    </Typography>
                  </ExpansionPanelSummary>
                  <ExpansionPanelDetails>
                    {mapInfo.regions.map((region, i) => {
                      return (
                        <div className="region" key={i}>
                          <h3>{region.name}</h3>
                          <p className="region-group">
                            {region.boundary_group}
                          </p>
                          <p className="region-description">{region.descrip}</p>
                        </div>
                      );
                    })}
                  </ExpansionPanelDetails>
                </ExpansionPanel>
              ) : (
                ""
              )}

              {mapInfo &&
              mapInfo.mapData &&
              mapInfo.mapData.length &&
              mapInfo.mapData[0].strat_name.length ? (
                <span>
                  <Divider />
                  <ExpansionPanel
                    classes={{ root: "regional-panel" }}
                    onChange={this.openGdd}
                    onChange={this.collapse("gdd")}
                    expanded={gddExpanded}
                  >
                    <ExpansionPanelSummary
                      expandIcon={<ExpandMoreIcon />}
                      classes={expansionPanelClasses}
                    >
                      <Typography className="expansion-summary-title">
                        Primary Literature{" "}
                        <span className="via-gdd">via GeoDeepDive</span>{" "}
                      </Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails
                      classes={expansionPanelDetailSubClasses}
                    >
                      <div
                        className={
                          this.props.fetchingGdd
                            ? "infoDrawer-loading"
                            : "hidden"
                        }
                      >
                        <CircularProgress size={50} />
                      </div>
                      {gddInfo.length
                        ? gddInfo.map((journal) => {
                            return (
                              <Journal data={journal} key={journal.name} />
                            );
                          })
                        : ""}
                    </ExpansionPanelDetails>
                  </ExpansionPanel>
                </span>
              ) : (
                ""
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    infoDrawerOpen: state.update.infoDrawerOpen,
    infoDrawerExpanded: state.update.infoDrawerExpanded,
    mapInfo: state.update.mapInfo,
    fetchingMapInfo: state.update.fetchingMapInfo,
    fetchingColumnInfo: state.update.fectchingColumnInfo,
    fetchingGdd: state.update.fetchingGdd,
    columnInfo: state.update.columnInfo,
    infoMarkerLng: state.update.infoMarkerLng,
    infoMarkerLat: state.update.infoMarkerLat,
    gddInfo: state.update.gddInfo,
    fetchingPbdb: state.update.fetchingPbdb,
    pbdbData: state.update.pbdbData,
    mapHasBedrock: state.update.mapHasBedrock,
    mapHasSatellite: state.update.mapHasSatellite,
    mapHasColumns: state.update.mapHasColumns,
    mapHasFossils: state.update.mapHasFossils,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    closeInfoDrawer: () => {
      dispatch(closeInfoDrawer());
    },
    expandInfoDrawer: () => {
      dispatch(expandInfoDrawer());
    },
    getColumn: (lng, lat) => {
      dispatch(getColumn(lng, lat));
    },
    getGdd: () => {
      dispatch(getGdd());
    },
  };
};

const InfoDrawerContainer = connect(
  mapStateToProps,
  mapDispatchToProps
)(InfoDrawer);

export default InfoDrawerContainer;

import React, { Component } from "react";
import { Icon, Card, Button } from "@blueprintjs/core";

import CircularProgress from "@material-ui/core/CircularProgress";
import { connect } from "react-redux";
import {
  closeInfoDrawer,
  expandInfoDrawer,
  getColumn,
  getGdd,
} from "../../actions";

import Journal from "../gdd/Journal";

import { ExpansionPanel, ExpansionPanelSummary } from "./ExpansionPanel";
import { addCommas, normalizeLng } from "../../utils";
import { InfoDrawerHeader } from "./header";
import { FossilCollections } from "./fossil-collections";
import { GeologicMapInfo } from "./geo-map";
import { MacrostratLinkedData } from "./macrostrat-linked";
import { RegionalStratigraphy } from "./reg-strat";
import { Physiography } from "./physiography";
import { GddExpansion } from "./gdd";

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
      if (panel === "gdd") {
        if (!this.state.gddExpanded) {
          this.openGdd();
        }
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

    if (!mapInfo || !mapInfo.mapData) {
      mapInfo = {
        mapData: [],
      };
    }

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

    if (!infoDrawerOpen) {
      return null;
    }

    return (
      <div className="infodrawer-container">
        <Card className="infodrawer">
          <InfoDrawerHeader
            mapInfo={mapInfo}
            infoMarkerLng={this.props.infoMarkerLng}
            infoMarkerLat={this.props.infoMarkerLat}
            onCloseClick={closeInfoDrawer}
          />
          <div>
            <div
              className={
                this.props.fetchingMapInfo ? "infoDrawer-loading" : "hidden"
              }
            >
              <CircularProgress size={50} />
            </div>
            <div className={this.props.fetchingMapInfo ? "hidden" : "d"}>
              <FossilCollections data={pbdbData} expanded={pbdbExpanded} />
              <GeologicMapInfo
                mapInfo={mapInfo}
                bedrockExpanded={bedrockExpanded}
                source={source}
              />
              <MacrostratLinkedData
                mapInfo={mapInfo}
                bedrockMatchExpanded={bedrockMatchExpanded}
                source={source}
              />
              <RegionalStratigraphy
                mapInfo={mapInfo}
                columnInfo={this.props.columnInfo}
              />
              <Physiography mapInfo={mapInfo} />
              <GddExpansion
                mapInfo={mapInfo}
                gddInfo={gddInfo}
                openGdd={this.openGdd}
                fetchingGdd={this.props.fetchingGdd}
              />
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

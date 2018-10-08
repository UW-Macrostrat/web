import React, { Component } from 'react'
import PropTypes from 'prop-types'
import AnimateHeight from 'react-animate-height'
import Drawer from 'material-ui/Drawer'
import List, { ListItem, ListItemText, ListItemIcon, ListItemSecondaryAction } from 'material-ui/List'
import Divider from 'material-ui/Divider'
import Collapse from 'material-ui/transitions/Collapse'
import Grid from 'material-ui/Grid'
import ExpansionPanel, {
  ExpansionPanelDetails,
  ExpansionPanelSummary,
} from 'material-ui/ExpansionPanel'
import { CircularProgress } from 'material-ui/Progress'
import Table, { TableBody, TableCell, TableHead, TableRow } from 'material-ui/Table'
import Card, { CardContent } from 'material-ui/Card'
import Paper from 'material-ui/Paper'


import CloseIcon from 'material-ui-icons/Close'
import Button from 'material-ui/Button'
import IconButton from 'material-ui/IconButton'
import InfoOutlineIcon from 'material-ui-icons/InfoOutline'
import LocationOnIcon from 'material-ui-icons/LocationOn'
import ExpandMoreIcon from 'material-ui-icons/ExpandMore'
import ExpandLessIcon from 'material-ui-icons/ExpandLess'
import Typography from 'material-ui/Typography'

import AgeChip from './AgeChip'
import MacrostratAgeChip from './MacrostratAgeChip'
import LithChip from './LithChip'
import AttrChip from './AttrChip'
import Reference from './Reference'
import MapSource from './MapSource'
import LongText from './LongText'
import PBDBCollections from './PBDBCollections'

import { addCommas } from '../utils'

class InfoDrawer extends Component {
  constructor(props) {
    super(props)
    // Need to run this when drawer is opened
    this.state = {
      expanded: null,
      bedrockExpanded: this.props.mapHasBedrock,
      bedrockMatchExpanded: this.props.mapHasBedrock,
      stratigraphyExpanded: this.props.mapHasColumns
    }

    // this.bedrockExpanded = this.props.mapHasBedrock
    // this.bedrockMatchExpanded = this.props.mapHasBedrock
    // this.stratigraphyExpanded = this.props.mapHasColumns

    this.handleChange = panel => (event, expanded) => {
      this.setState({
        expanded: expanded ? panel : false,
      })
    }
    this.collapse = panel => (event) => {
      if (panel === 'bedrock') {
        this.setState({
          bedrockExpanded : !this.state.bedrockExpanded
        })
      } else if (panel === 'bedrockMatch') {
        this.setState({
          bedrockMatchExpanded: !this.state.bedrockMatchExpanded
        })
      } else if (panel === 'stratigraphy') {
        this.setState({
          stratigraphyExpanded: !this.state.stratigraphyExpanded
        })
        // if (!this.state.stratigraphyExpanded) {
        //   console.log('get column!')
        //   this.props.getColumn()
        // }
      }

    }
    // this.openColumnInfo = (event, expanded) => {
    //   if (Object.keys(this.props.columnInfo).length === 0) {
    //     this.props.getColumn()
    //   }
    // }
    this.openGdd = (event, expanded) => {
      if (this.props.gddInfo.length === 0) {
        this.props.getGdd()
      }
    }
  }

  normalizeLng(lng) {
    // via https://github.com/Leaflet/Leaflet/blob/32c9156cb1d1c9bd53130639ec4d8575fbeef5a6/src/core/Util.js#L87
    return (((lng - 180) % 360 + 360) % 360 - 180).toFixed(4);
  }

  componentWillReceiveProps(nextProps) {

    this.setState({
      bedrockExpanded: nextProps.mapHasBedrock,
      bedrockMatchExpanded: nextProps.mapHasBedrock
    })

    if (nextProps.mapHasColumns != this.props.mapHasColumns) {
      this.setState({
        stratigraphyExpanded: nextProps.mapHasColumns
      })
    //  this.props.getColumn()
    }

    // Reset the state when the drawer is closed
    if (nextProps.infoDrawerOpen === false && this.props.infoDrawerOpen === true) {
      this.setState({
        bedrockExpanded: nextProps.mapHasBedrock,
        bedrockMatchExpanded: nextProps.mapHasBedrock,
        stratigraphyExpanded: nextProps.mapHasColumns,
      })
    }

    // if (nextProps.mapHasColumns) {
    //   console.log('next prop has columns! go get it')
    //   this.props.getColumn()
    // }
  }

  render() {
    console.log('render infoDrawer')
    const { infoDrawerOpen, closeInfoDrawer, expandInfoDrawer, infoDrawerExpanded } = this.props
    let { mapInfo, gddInfo, pbdbData } = this.props

    const { expanded, bedrockExpanded, bedrockMatchExpanded, stratigraphyExpanded } = this.state

    let expansionPanelClasses = {
      'content': 'expansion-panel',
      'root': 'expansion-panel-root'
    }
    let expansionPanelDetailClasses = {
      'root': 'expansion-panel-detail'
    }

    let exitTransition = {
      exit: 1000
    }

    if (!mapInfo || !mapInfo.mapData) {
      mapInfo = {
        mapData: []
      }
    }

    let height = (this.props.infoDrawerExpanded) ? 'auto' : '0'
    let source = (mapInfo && mapInfo.mapData && mapInfo.mapData.length)
    ? mapInfo.mapData[0]
    : {
      name: null,
      descrip: null,
      comments: null,
      liths: [],
      b_int: {},
      t_int: {},
      ref: {}
    }

    // if (Object.keys(this.props.columnInfo).length != 0) {
    //   this.props.columnInfo.column.map(d => {
    //     let unitHTML = d.units.map(j => {
    //       return <tr>
    //         <td width={100} colspan=>
    //
    //         </td>
    //       </tr>
    //     })
    //   })
    // }
    // if (Object.keys(this.props.columnInfo).length != 0) {
    //   console.log(this.props.columnInfo.timescale)
    // }

    return (
      <Drawer
        anchor={window.innerWidth > 850 ? "right" : "bottom"}
        open={infoDrawerOpen}
        onBackdropClick={closeInfoDrawer}
        transitionDuration={300}
        hideBackdrop={true}
        disableAutoFocus={true}
        classes={{
          "paper": "infoDrawer"
        }}
        ModalProps={{
          classes: {
            'root': 'infoDrawer-root'
          }
        }}
      >

      <div className={this.props.fetchingMapInfo ? "infoDrawer-loading" : "hidden"}  container alignItems="center" alignContent="center" justify="center">
        <CircularProgress size={50} />
      </div>
      <div className={this.props.fetchingMapInfo ? "hidden" : "d"}>
      <Grid container alignItems="center" alignContent="center" justify="center" classes={{ 'spacing-xs-16': 'infodrawer-grid' }}>

        <Grid item xs={12}>
          <div className="infodrawer-content">

            <Grid container alignItems="center" alignContent="center">
              <Grid item xs={12} classes={{ 'grid-xs-12': 'infodrawer-header-grid'}}>
                <div className="infodrawer-header">
                  {mapInfo.elevation ?
                    <div className="infodrawer-header-item lnglat-container">
                      <span className="lnglat">
                        {this.normalizeLng(this.props.infoMarkerLng)}  {this.props.infoMarkerLat}
                      </span>
                      <span className="z">
                        {mapInfo.elevation}<span className='age-chip-ma'>m</span> | {(mapInfo.elevation * 3.28084).toFixed(0)}<span className='age-chip-ma'>ft</span>
                      </span>
                    </div>
                  : ''}

                  <div className="infodrawer-header-item">
                    <IconButton color="default" aria-label="InfoDrawer" onClick={closeInfoDrawer}>
                      <CloseIcon/>
                    </IconButton>
                  </div>
                </div>
                {
                  pbdbData && pbdbData.length > 0 ?
                  <PBDBCollections data={pbdbData}/>
                  : ''
                }

              </Grid>
              </Grid>


              {
                mapInfo && mapInfo.mapData && mapInfo.mapData.length ?
                <span>
                  <ExpansionPanel classes={{ 'root': 'regional-panel'}} onChange={this.collapse('bedrock')} expanded={bedrockExpanded}>
                    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} classes={expansionPanelClasses}>
                      <Typography className="expansion-summary-title">Geologic map <span className='via-gdd'>via providers, Macrostrat</span> </Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails classes={expansionPanelDetailClasses}>
                      <div className="map-source-attrs">
                        {
                          source.name && source.name.length
                          ? <div className="map-source-attr">
                              <span className="attr">Name: </span> {source.name}
                            </div>
                          : ''
                        }
                        {
                          source.age && source.age.length
                          ? <div className="map-source-attr">
                              <span className="attr">Age: </span> {source.age} ({ source.b_int.b_age } - {source.t_int.t_age}<span className="age-chip-ma">Ma</span>)
                            </div>
                          : ''
                        }
                        {
                          source.strat_name && source.strat_name.length
                          ? <LongText name="Stratigraphic name(s)" text={source.strat_name}/>
                          :''
                        }
                        {
                          source.lith && source.lith.length
                          ? <LongText name="Lithology" text={source.lith}/>
                          : ''
                        }
                        {
                          source.descrip && source.descrip.length
                          ? <LongText name="Description" text={source.descrip}/>
                          : ''
                        }
                        {
                          source.comments && source.comments.length
                          ? <LongText name="Comments" text={source.comments}/>
                          : ''
                        }
                        {
                          source.lines && source.lines.length
                          ?
                            <div className="map-source-attr">
                              <span className="attr">Lines: </span>
                              {source.lines.map((line, idx) => {
                                return <div className="map-source-line" key={idx}>
                                  {
                                    line.name
                                    ? <span className="line-attr"><span className="attr">Name: </span> {line.name}</span>
                                    : ''
                                  }
                                  {
                                    line.type
                                    ? <span className="line-attr"><span className="attr">Type: </span> {line.type}</span>
                                    : ''
                                  }
                                  {
                                    line.direction
                                    ? <span className="line-attr"><span className="attr">Direction: </span> {line.direction}</span>
                                    : ''
                                  }
                                  {
                                    line.descrip
                                    ? <span className="line-attr"><span className="attr">Description: </span> {line.descrip}</span>
                                    : ''
                                  }
                                </div>
                              })}
                            </div>

                          : ''
                        }
                        <Reference reference={source.ref} />
                      </div>
                    </ExpansionPanelDetails>
                  </ExpansionPanel>
                </span>
                : ''
              }


              {
                mapInfo && mapInfo.mapData && mapInfo.mapData.length ?
                <span>
                  <Divider/>
                  <ExpansionPanel classes={{ 'root': 'regional-panel'}} onChange={this.collapse('bedrockMatch')} expanded={bedrockMatchExpanded}>
                    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} classes={expansionPanelClasses}>
                      <Typography className="expansion-summary-title">Geologic Map (inferred) <span className='via-gdd'>via Macrostrat</span> </Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails classes={expansionPanelDetailClasses}>
                      {
                        mapInfo && mapInfo.mapData && mapInfo.mapData.length && (!source.macrostrat || Object.keys(source.macrostrat).length === 0)
                        ? <AgeChip b_int={mapInfo.mapData[0].b_int} t_int={mapInfo.mapData[0].t_int}></AgeChip>
                        : ''
                      }
                      {
                        source.macrostrat && source.macrostrat.b_age  ?
                        <ExpansionPanel>
                          <ExpansionPanelSummary classes={expansionPanelClasses}>
                            <Typography className="expansion-summary-title">Age: </Typography>
                            <MacrostratAgeChip
                              b_int={source.macrostrat.b_int}
                              t_int={source.macrostrat.t_int}
                              b_age={source.macrostrat.b_age}
                              t_age={source.macrostrat.t_age}
                              color={source.color}
                            />
                          </ExpansionPanelSummary>
                        </ExpansionPanel>
                        : ''
                      }

                      {
                        source.macrostrat && source.macrostrat.strat_names ?
                        <ExpansionPanel expanded={expanded === 'strat_names'} onChange={this.handleChange('strat_names')}>
                          <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} classes={expansionPanelClasses}>
                            <Typography className="expansion-summary-title">Match basis: </Typography>
                            {source.macrostrat.strat_names[0].rank_name}
                            {
                              source.macrostrat.strat_names.length > 1 ?
                              '...'
                              : ''
                            }
                          </ExpansionPanelSummary>
                          <ExpansionPanelDetails classes={expansionPanelDetailClasses}>
                            <p className="expansion-panel-detail-header">
                              All matched names:
                            </p>
                            <Divider/>
                            {source.macrostrat.strat_names.map((name, i) => {
                              if (i != source.macrostrat.strat_names.length - 1) {
                                return <span key={i}><a className="externalLink" href={"https://macrostrat.org/sift/#/strat_name/" + name.strat_name_id} key={i}>{ name.rank_name }</a>, </span>
                              } else {
                                return <span key={i}><a className="externalLink" href={"https://macrostrat.org/sift/#/strat_name/" + name.strat_name_id} key={i}>{ name.rank_name }</a></span>
                              }

                            })}
                          </ExpansionPanelDetails>
                        </ExpansionPanel>
                        : ''
                      }

                      {
                        source.macrostrat && source.macrostrat.max_thick ?
                        <ExpansionPanel>
                          <ExpansionPanelSummary classes={expansionPanelClasses}>
                            <Typography className="expansion-summary-title">Thickness: </Typography>
                            <Typography className="expansion-summary-detail">{ source.macrostrat.min_min_thick } - { source.macrostrat.max_thick }<span className='age-chip-ma'>m</span></Typography>
                          </ExpansionPanelSummary>
                        </ExpansionPanel>
                        : ''
                      }

                      {
                        source.macrostrat && source.macrostrat.pbdb_collections ?
                        <ExpansionPanel expanded={expanded === 'fossil_collections'} onChange={this.handleChange('fossil_collections')}>
                          <ExpansionPanelSummary classes={expansionPanelClasses}>
                            <Typography className="expansion-summary-title">Fossil collections: </Typography>
                            <Typography className="expansion-summary-detail">{ source.macrostrat.pbdb_collections }</Typography>
                          </ExpansionPanelSummary>
                        </ExpansionPanel>
                        : ''
                      }
                      {
                        source.macrostrat && source.macrostrat.pbdb_occs ?
                        <ExpansionPanel expanded={expanded === 'fossil_occs'} onChange={this.handleChange('fossil_occs')}>
                          <ExpansionPanelSummary classes={expansionPanelClasses}>
                            <Typography className="expansion-summary-title">Fossil occurrences: </Typography>
                            <Typography className="expansion-summary-detail">{ source.macrostrat.pbdb_occs }</Typography>
                          </ExpansionPanelSummary>
                        </ExpansionPanel>
                        : ''
                      }

                      {
                        source.macrostrat && source.macrostrat.liths && source.macrostrat.liths.length ?
                        <ExpansionPanel expanded={expanded === 'lithology'} onChange={this.handleChange('lithology')}>
                          <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} classes={expansionPanelClasses}>
                            <Typography className="expansion-summary-title">Lithology: </Typography>
                            {source.macrostrat && source.macrostrat.lith_classes ? source.macrostrat.lith_classes.map( (lithClass, i) => {
                              return <AttrChip key={i} name={lithClass.name} color={lithClass.color} />
                            }) : ''}
                          </ExpansionPanelSummary>
                          <ExpansionPanelDetails classes={expansionPanelDetailClasses}>
                            <p className="expansion-panel-detail-header">
                              Matched lithologies:
                            </p>
                            <Divider/>
                            {source.macrostrat.liths.map( (lith, i) => {
                              return <AttrChip key={i} name={lith.lith} color={lith.color} fill={lith.lith_fill}/>
                            })}
                          </ExpansionPanelDetails>
                        </ExpansionPanel>
                        : ''
                      }

                      {
                        source.macrostrat && source.macrostrat.environs && source.macrostrat.environs.length ?
                        <ExpansionPanel expanded={expanded === 'environment'} onChange={this.handleChange('environment')}>
                          <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} classes={expansionPanelClasses}>
                            <Typography className="expansion-summary-title">Environment: </Typography>
                            {source.macrostrat && source.macrostrat.environ_classes ? source.macrostrat.environ_classes.map( (environClass, i) => {
                              return <AttrChip key={i} name={environClass.name} color={environClass.color} />
                            }) : ''}
                          </ExpansionPanelSummary>
                          <ExpansionPanelDetails classes={expansionPanelDetailClasses}>
                            <p className="expansion-panel-detail-header">
                              Matched environments:
                            </p>
                            <Divider/>
                            {source.macrostrat.environs.map( (environ, i) => {
                              return <AttrChip key={i} name={environ.environ} color={environ.color}/>
                            })}
                          </ExpansionPanelDetails>
                        </ExpansionPanel>
                        : ''
                      }

                      {
                        source.macrostrat && source.macrostrat.econs && source.macrostrat.econs.length ?
                        <ExpansionPanel expanded={expanded === 'economy'} onChange={this.handleChange('economy')}>
                          <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} classes={expansionPanelClasses}>
                            <Typography className="expansion-summary-title">Economy: </Typography>
                            {source.macrostrat && source.macrostrat.econ_classes ? source.macrostrat.econ_classes.map( (econClass, i) => {
                              return <AttrChip key={i} name={econClass.name} color={econClass.color} />
                            }) : ''}
                          </ExpansionPanelSummary>
                          <ExpansionPanelDetails classes={expansionPanelDetailClasses}>
                            <p className="expansion-panel-detail-header">
                              Matched economic attributes:
                            </p>
                            <Divider/>
                            {source.macrostrat.econs.map( (econ, i) => {
                              return <AttrChip key={i} name={econ.econ} color={econ.color}/>
                            })}
                          </ExpansionPanelDetails>
                        </ExpansionPanel>
                        : ''
                      }

                    </ExpansionPanelDetails>
                  </ExpansionPanel>
                </span>
                : ''
            }


              {
                mapInfo && mapInfo.mapData && mapInfo.hasColumns ?
                <span>
                  <Divider/>
                  <ExpansionPanel classes={{ 'root': 'regional-panel'}} onChange={this.collapse('stratigraphy')} expanded={stratigraphyExpanded}>
                    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} classes={expansionPanelClasses}>
                      <Typography className="expansion-summary-title">Regional stratigraphy </Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails classes={expansionPanelDetailClasses}>
                      { Object.keys(this.props.columnInfo).length != 0 ?
                        <Table>
                          <TableBody>
                            <TableRow>
                              <TableCell>
                                <Typography className="expansion-summary-title">Thickness:</Typography>
                              </TableCell>
                              <TableCell>
                                { addCommas(parseInt(this.props.columnInfo.min_thick)) } - { addCommas(parseInt(this.props.columnInfo.max_thick)) } <span className='age-chip-ma'>m</span>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>
                                <Typography className="expansion-summary-title">Age:</Typography>
                              </TableCell>
                              <TableCell>
                                { this.props.columnInfo.b_age } - { this.props.columnInfo.t_age } <span className='age-chip-ma'>Ma</span>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>
                                <Typography className="expansion-summary-title">Area:</Typography>
                              </TableCell>
                              <TableCell>
                                { addCommas(this.props.columnInfo.area) } <span className='age-chip-ma'>km2</span>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>
                                <Typography className="expansion-summary-title">Fossil collections:</Typography>
                              </TableCell>
                              <TableCell>
                                { addCommas(this.props.columnInfo.pbdb_collections) }
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell>
                                <Typography className="expansion-summary-title">Fossil occurrences:</Typography>
                              </TableCell>
                              <TableCell>
                                { addCommas(this.props.columnInfo.pbdb_occs) }
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

                        : ''
                      }
                    </ExpansionPanelDetails>
                  </ExpansionPanel>
                </span>
                : ''
              }

              {
                mapInfo.regions && mapInfo.regions.length ?
                <ExpansionPanel classes={{ 'root': 'regional-panel'}}>
                  <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} classes={expansionPanelClasses}>
                    <Typography className="expansion-summary-title">Physiography </Typography>
                  </ExpansionPanelSummary>
                  <ExpansionPanelDetails classes={expansionPanelDetailClasses}>
                    {mapInfo.regions.map((region, i) => {
                      return (
                        <div className='region' key={i}>
                          <h3>{region.name}</h3>
                          <p className='region-group'>{region.boundary_group}</p>
                          <p className='region-description'>{region.descrip}</p>
                        </div>
                      )
                    })}
                  </ExpansionPanelDetails>
                </ExpansionPanel>
                : ''
              }

              {
                mapInfo && mapInfo.mapData && mapInfo.mapData.length && mapInfo.mapData[0].strat_name.length  ?
                <span>
                  <Divider/>
                  <ExpansionPanel classes={{ 'root': 'regional-panel'}} onChange={this.openGdd}>
                    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />} classes={expansionPanelClasses}>
                      <Typography className="expansion-summary-title">Primary Literature <span className='via-gdd'>via GeoDeepDive</span> </Typography>
                    </ExpansionPanelSummary>
                    <ExpansionPanelDetails classes={expansionPanelDetailClasses}>
                      {gddInfo.length ?
                        gddInfo.map((article, ai) => {
                          return (
                            <div className='article' key={ai}>
                              <h3 className='article-title'>
                                <a href={article.url} target="_blank">
                                  {article.title}.
                                  <span className="sub-title">
                                    {article.authors.map(d => { return d.name}).join(', ')}. {article.coverdate}. {article.journal}. {article.publisher}.
                                  </span>
                                </a>
                              </h3>
                              <div className="quotes">
                                {article.snippets.map((snippet, si) => {
                                   let text = snippet.replace(/<em class="hl">/g, "@@@")
                                      .replace(/<\/em>/g, "***")
                                      .replace(/(?:\r\n|\r|\n|\<|\>)/g, ' ')
                                      .trim()
                                      .replace(/@@@/g, '<em class="hl">')
                                      .replace(/\*\*\*/g, '</em>');
                                  return <p className='gdd-snippet' key={si} dangerouslySetInnerHTML={{__html: '...' + text + '...'}}></p>
                                })}
                              </div>
                            </div>
                          )
                        })
                      : ''}
                    </ExpansionPanelDetails>
                  </ExpansionPanel>
                </span>
                : ''
              }
            </div>

        </Grid>
      </Grid>
      </div>
    </Drawer>
    )
  }
}

export default InfoDrawer

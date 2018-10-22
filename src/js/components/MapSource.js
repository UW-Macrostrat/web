import React, { Component } from 'react'
import AgeChip from './AgeChip'
import LithChip from './LithChip'
import Reference from './Reference'
import Divider from '@material-ui/core/Divider'
import IconButton from '@material-ui/core/IconButton'
import Collapse from '@material-ui/core/Collapse'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import ExpandLessIcon from '@material-ui/icons/ExpandLess'

class MapSource extends Component {
  constructor(props) {
    super(props)
    this.state = {
      descripExpanded: false,
      commentsExpanded: false
    }
    this.toggleDescripExpand = this.toggleDescripExpand.bind(this)
  }
  toggleDescripExpand() {
    this.setState({'descripExpanded': !this.state.descripExpanded})
  }
  toggleCommentsExpand() {
    this.setState({'commentsExpanded': !this.state.commentsExpanded})
  }

  hexToRgb(hex) {
    if (!hex) { return 'rgba(0,0,0,0.3)'}
    hex = hex.replace('#', '')
    let bigint = parseInt(hex, 16)
    let r = (bigint >> 16) & 255
    let g = (bigint >> 8) & 255
    let b = bigint & 255
    return `rgba(${r},${g},${b},0.8)`
  }

  render() {
    return (
      <div className="map-source">
        <Divider light />
        <h1 className="infoDrawer-title">
          {
            this.props.source.name && this.props.source.name.length
            ? this.props.source.name
            : ( this.props.source.descrip || 'No data found' )
          }
        </h1>
        <AgeChip b_int={this.props.source.b_int} t_int={this.props.source.t_int}></AgeChip>
        {this.props.source.liths.map( (lith, i) => {
          return <LithChip key={i} lith={lith}/>
        })}

        <div className="map-source-attrs">
          {
            this.props.source.name && this.props.source.name.length
            ? <div className="map-source-attr">
                <span className="attr">Name: </span> {this.props.source.name}
              </div>
            : ''
          }
          {
            this.props.source.age && this.props.source.age.length
            ? <div className="map-source-attr">
                <span className="attr">Age: </span> {this.props.source.age}
              </div>
            : ''
          }
          {
            this.props.source.strat_name && this.props.source.strat_name.length
            ? <div className="map-source-attr">
                <span className="attr">Stratigraphic name(s): </span> {this.props.source.strat_name}
              </div>
            :''
          }
          {
            this.props.source.lith && this.props.source.lith.length
            ? <div className="map-source-attr">
                <span className="attr">Lithology: </span> {this.props.source.lith}
              </div>
            : ''
          }
          {
            this.props.source.descrip && this.props.source.descrip.length
            ? <div className="map-source-attr">
              <span className="attr">Description: </span> {this.props.source.descrip.substr(0, 250)}
                { this.props.source.descrip.length > 250
                  ?
                  <span>
                    ...
                    <span className={this.state.descripExpanded ? 'hidden' : ''}>
                      <IconButton color="default" aria-label="Show more" onClick={this.toggleDescripExpand}>
                        <ExpandMoreIcon />
                      </IconButton>
                    </span>
                    <span className={this.state.descripExpanded ? '' : 'hidden'}>
                      <IconButton color="default" aria-label="Show more" onClick={this.toggleDescripExpand}>
                        <ExpandLessIcon />
                      </IconButton>
                    </span>
                    <Collapse in={this.state.descripExpanded} timeout="auto" unmountOnExit>
                      ...{ this.props.source.descrip.substr(250, this.props.source.descrip.length) }
                    </Collapse>
                  </span>

                  : ''
                }

            </div>
            : ''
          }
          {
            this.props.source.comments && this.props.source.comments.length
            ? <div className="map-source-attr">
              <span className="attr">Comments: </span> {this.props.source.comments.substr(0, 250)}
                { this.props.source.descrip.length > 250
                  ?
                  <span>
                    ...
                    <span className={this.state.commentsExpanded ? 'hidden' : ''}>
                      <IconButton color="default" aria-label="Show more" onClick={this.toggleCommentsExpand}>
                        <ExpandMoreIcon />
                      </IconButton>
                    </span>
                    <span className={this.state.descripExpanded ? '' : 'hidden'}>
                      <IconButton color="default" aria-label="Show more" onClick={this.toggleCommentsExpand}>
                        <ExpandLessIcon />
                      </IconButton>
                    </span>
                    <Collapse in={this.state.commentsExpanded} timeout="auto" unmountOnExit>
                      ...{ this.props.source.comments.substr(250, this.props.source.comments.length) }
                    </Collapse>
                  </span>

                  : ''
                }

            </div>
            : ''
          }
          {
            this.props.source.lines && this.props.source.lines.length
            ?
              <div className="map-source-attr">
                <span className="attr">Lines: </span>
                {this.props.source.lines.map((line, idx) => {
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

          <Reference reference={this.props.source.ref} />
        </div>
      </div>
    )

  }
}

export default MapSource

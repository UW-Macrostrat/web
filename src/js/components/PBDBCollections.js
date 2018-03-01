import React, { Component } from 'react'
import Paper from 'material-ui/Paper'
import AppBar from 'material-ui/AppBar'
import Tabs, { Tab, TabContainer } from 'material-ui/Tabs'
import Typography from 'material-ui/Typography'
import { makeOccurrenceTree } from '../utils'

class PBDBCollections extends Component {
  constructor(props) {
    super(props)
    this.state = {}
    this.handleChange = (event, tab, idx) => {
      this.setState({
        [ idx ]: tab
      })
    }
  }

  render() {
    let collections = this.props.data.map((col, idx) => {
      let occurrenceTree = makeOccurrenceTree(col.occurrences)

      if (Object.keys(this.state).indexOf('col' + idx) === -1) {
        this.state['col' + idx] = 0
      }

      return (
        <Paper key={idx} classes={{ 'root': 'pbdb-collection-paper' }}>

            <Tabs
              value={this.state['col' + idx]}
              onChange={(event, tab) => this.handleChange(event, tab, 'col' + idx)}
              indicatorColor="primary"
              textColor="primary"
              fullWidth
              >
              <Tab label="Info"/>
              <Tab label={`Occurrences (${col.occurrences.length})`} disabled={col.occurrences.length ? false : true}/>
            </Tabs>

          <div className='pbdb-collection-content'>
            {
              this.state['col' + idx] === 0 &&

              <div>
                { col.nam &&
                  <div className="map-source-attr">
                    <span className="attr">Name: </span> { col.nam }
                  </div>
                }
                { col.oid &&
                  <div className="map-source-attr">
                    <span className="attr">Collection no.: </span> <a href={`https://paleobiodb.org/classic/basicCollectionSearch?collection_no=${col.oid.replace('col:', '')}`} target="_blank">{ col.oid.replace('col:', '') }</a>
                  </div>
                }
                { col.oei &&
                  <div className="map-source-attr">
                    <span className="attr">Age: </span> { col.oei } ({ col.lag } - {col.lag}<span className="age-chip-ma">Ma</span>)
                  </div>
                }
                { col.sgr &&
                  <div className="map-source-attr">
                    <span className="attr">Group: </span> { col.sgr }
                  </div>
                }
                { col.sfm &&
                  <div className="map-source-attr">
                    <span className="attr">Formation: </span> { col.sfm }
                  </div>
                }
                { col.lt1 &&
                  <div className="map-source-attr">
                    <span className="attr">Lithology: </span> { col.la1 ? col.la1 : '' } { col.lf1 ? col.lf1 : ''} { col.lt1 } { col.lt2 ? ', ' : '' }
                      { col.la2 ? col.la2 : '' } { col.lf2 ? col.lf2 : ''} { col.lt2 }
                  </div>
                }
                { col.env &&
                  <div className="map-source-attr">
                    <span className="attr">Environment: </span> { col.env }
                  </div>
                }
                { col.ref &&
                  <div className="reference map-source-attr">
                    <span className="attr">Reference: </span> <span dangerouslySetInnerHTML={{__html: col.ref }}></span>
                  </div>
                }

              </div>

            }

            {
              this.state['col' + idx] === 1 &&
              <div>
                <ul className='taxon-list phylum-list'>
                  {occurrenceTree.phyla.map((phylum, pidx) => {
                    return (
                      <div key={pidx} className='phyla'>
                        <li>{phylum.phylum}</li>
                        <ul className='taxon-list'>
                          {phylum.classes.map((cls, clsidx) => {
                            return (
                              <div key={clsidx} className='classes'>
                                <li>{cls.nameClass}</li>
                                <ul className='taxon-list'>
                                  {cls.families.map((family, familyidx) => {
                                    return (
                                      <div key={familyidx} className='families'>
                                        <li>{family.family}</li>
                                        <ul className='taxon-list genera'>
                                          {family.genera.map((genus, genusidx) => {
                                            return (
                                              <li key={genusidx}>
                                                { genus.old_name ? '"' + genus.old_name + '" - ' : '' }
                                                { genus.genusRes ?genus.genusRes : ' ' }
                                                { genus.display_name1 }
                                                <i>
                                                  { genus.display_name2 ? genus.display_name2 : ''}
                                                  { genus.display_name3 ? genus.display_name3 : '' }
                                                </i>
                                              </li>
                                            )
                                          })}
                                        </ul>
                                      </div>
                                    )
                                  })}
                                </ul>
                              </div>
                            )
                          })}
                        </ul>
                      </div>
                    )
                  })}
                </ul>

              </div>
            }

          </div>

        </Paper>
      )
    })

    return (
        <div>
          <h1 className="infoDrawer-title-no-ellipsis infoDrawer-title-main">Fossil Collections</h1>
          <p>Via the Paleobiology Database</p>
          { this.props.data && collections }
        </div>
    )

  }
}

export default PBDBCollections

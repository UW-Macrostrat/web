import React from 'react';
import Utilities from './Utilities';

class StratNameHierarchy extends React.Component {
  constructor(props) {
    super(props);
    this.state = this._resetState();
  }

  _resetState() {
    return {
      hierarchy: {
        strat_name: '',
        strat_name_id: '',
        rank: '',
        active: '',
        children: []
      }
    }
  }


  _update(id) {
    Utilities.fetchData(`defs/strat_names?rule=all&strat_name_id=${id}`, (error, data) => {
      if (error) {
        return this.setState(this._resetState());
      }

      var rankMap = {'SGp': null, 'Gp': 'sgp', 'SubGp': 'gp', 'Fm': 'subgp', 'Mbr': 'fm', 'Bed': 'mbr', 1: null, 2: 'sgp', 3: 'gp', 4: 'subgp', 5: 'fm', 6: 'mbr'};
      var rankMapOrder = {'SGp': 1, 'Gp': 2, 'SubGp': 3, 'Fm': 4, 'Mbr': 5, 'Bed': 6};

      data = data.success.data;

      data.forEach(d => {
        // Figure out if this is the target name or not
        if (d.strat_name_id == id) {
          d.active = 'active-strat-name';
        } else {
          d.active = 'not-active-strat-name';
        }
        d.children = [];
        d.totalChildren = data.filter(j => {
          if (j[d.rank.toLowerCase() + '_id'] == d.strat_name_id) {
            return j
          }
        }).length - 1;
        d.total = d.totalChildren;
      });

      data.forEach(d => {
        var belongsTo = d[rankMap[d.rank] + '_id'];

        // Need to make sure belongsTo doesn't = 0 when it shouldn't (ex: strat_name_id=9574)
        var previousRank = 1;
        while (belongsTo === 0) {
          belongsTo = d[rankMap[rankMapOrder[d.rank] - previousRank] + '_id'];
          previousRank--;
        }

        // Find the one it belongs to and add it
        data.forEach(j => {
          if (j.strat_name_id == belongsTo && j.strat_name_id != d.strat_name_id) {
            j.children.push(d);
          }
        })
      });

      // Find the top of the hierarchy and return it
      this.setState({hierarchy: data.sort((a, b) => { return b.totalChildren - a.totalChildren })[0]});
    });
  }

  componentDidMount() {
    if (this.props.stratNameID.length) {
      this._update(this.props.stratNameID);
    }

  }

  componentWillReceiveProps(nextProps) {
    //console.log("updating hierarchy", nextProps.stratNameID);
    if (nextProps.stratNameID && (nextProps.stratNameID.length || nextProps.stratNameID > -1)) {
      this._update(nextProps.stratNameID);
    }
  }

  handleClick(id, event) {
    window.location.hash = '#/strat_name/' + id;
    event.stopPropagation();
  }

  render() {
    return (
      <div className={'hierarchy-container hierarchy-1 '  + this.state.hierarchy.active} onClick={this.handleClick.bind(null, this.state.hierarchy.strat_name_id)}>
        <div className='hierarchy-name'>{this.state.hierarchy.strat_name_long} <span className='badge'>{this.state.hierarchy.t_units}</span></div>

        {this.state.hierarchy.children.map((b, bi) => {
          return (

            <div key={bi} className={'hierarchy-container hierarchy-2 '  + b.active} onClick={this.handleClick.bind(null, b.strat_name_id)}>
              <div className='hierarchy-name'>{b.strat_name_long} <span className='badge'>{b.t_units}</span></div>

              {b.children.map((c, ci) => {
                return (

                  <div key={ci} className={'hierarchy-container hierarchy-3 '  + c.active} onClick={this.handleClick.bind(null, c.strat_name_id)}>
                    <div className='hierarchy-name'>{c.strat_name_long} <span className='badge'>{c.t_units}</span></div>

                    {c.children.map((d, di) => {
                      return (

                        <div key={di} className={'hierarchy-container hierarchy-4 '  + d.active} onClick={this.handleClick.bind(null, d.strat_name_id)}>
                          <div className='hierarchy-name'>{d.strat_name_long} <span className='badge'>{d.t_units}</span></div>

                          {d.children.map((e, ei) => {
                            return (
                              <div key={ei} className={'hierarchy-container hierarchy-5 '  + e.active} onClick={this.handleClick.bind(null, e.strat_name_id)}>
                                <div className='hierarchy-name'>{e.strat_name_long} <span className='badge'>{e.t_units}</span></div>
                              </div>
                            )
                          })}
                        </div>

                      )
                    })}
                  </div>

                )
              })}
            </div>

          )
        })}

      </div>

    );
  }
}

export default StratNameHierarchy;

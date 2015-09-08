import React from 'react';

class PrevalentTaxa extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      data: this.props.data
    }

  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.data != this.props.data) {
      this.setState({
        data: nextProps.data
      });
    }
  }

  render() {
    console.log('update prevalent-taxa');
    return (
      <div className={this.state.data[0].oid ? 'row prevalent-taxa-row' : 'hidden'}>
        <div className='col-xs-2 prevalent-taxa-container'>
          <div className='prevalent-taxa'>
            <p id='prevalent-taxa-title'>Prevalent taxa</p>
            <p><small>via <a className='normalize-link' href='https://paleobiodb.org' target='_blank'>PaleoBioDB</a></small></p>
          </div>
        </div>
        {this.state.data.map((d, idx) => {
          return (
            <div className='col-xs-2 prevalent-taxa-container' key={idx}>
              <div className='prevalent-taxa'>
                <img src={(d.img) ? ('https://paleobiodb.org/data1.2/taxa/thumb.png?id=' + d.img) : ''} title={d.nam + ' (' + d.noc + ' occurrences)'}/>
                <p><a className='normalize-link' href={'https://paleobiodb.org/cgi-bin/bridge.pl?a=basicTaxonInfo&taxon_no=' + d.oid} target='_blank'>{d.nam}</a></p>
              </div>
            </div>
          )
        })}

      </div>
    );
  }
}



export default PrevalentTaxa;

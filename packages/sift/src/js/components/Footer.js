import React from 'react';

class Footer extends React.Component {
  render() {
    return (
    <div className='footer'>
      <div className='footer-left'>
        <div className='footer-brand'>
          <img src='dist/img/logo.png' className='footer-logo'/> Macrostrat <br/>
          <img src='dist/img/cc-by.png' className='footer-license'/>
        </div>

      </div>
      <div className='footer-right'>
        <h4 className='footer-source-title'>Original sources</h4>
        <ul>
          {this.props.data.map(d => {
            return <li>{d}</li>
          })}
        </ul>

      </div>
    </div>
    )
  }
}

Footer.defaultProps = {
  features: [],
  type: 'route'
}
export default Footer;

import React from 'react';

var LongText = React.createClass({
  getInitialState: function() {
    return {
      hidden: true
    }
  },

  show: function() {
    this.setState({'hidden': false});
  },

  hide: function() {
    this.setState({'hidden': true});
  },

  render: function() {
    var maxLength = 200;
    var text = this.props.text;

    if (text.length > maxLength && text.length - maxLength > 50) {
      return (
        <div>
        <p className='info-attr'><strong>{this.props.title}: </strong>
        <span>{text.substr(0, maxLength)}</span>
        <span className={this.state.hidden ? 'ellipsis' : 'noDisplay'}>...</span>
        <span className={this.state.hidden ? 'noDisplay' : ''}>{text.substr(maxLength, text.length - maxLength)}</span>
        <span className={this.state.hidden ? 'show-more' : 'noDisplay'} onClick={this.show}>{' >>>'}</span>
        <span className={this.state.hidden ? 'noDisplay' : 'show-more'} onClick={this.hide}>{' <<<'}</span>
        </p>
        </div>
      );
    } else {
      return <div><p className='info-attr'><strong>{this.props.title}: </strong> <span>{text}</span></p></div>
    }
  }
});

export default LongText;

import React from 'react';

var MenuToggle = React.createClass({
  getInitialState() {
    return {
      open: false
    }
  },
  toggle: function() {
    this.setState({open: !this.state.open});
  },

  toggleOutcrop(event) {
    this.toggle();
    event.preventDefault();
    this.props.toggleOutcrop();
  },

  toggleSatellite(event) {
    this.toggle();
    event.preventDefault();
    this.props.toggleSatellite();
  },

  toggleFossils(event) {
    this.toggle();
    event.preventDefault();
    this.props.toggleFossils();
  },

  // A little hack to make sure the menu doesn't animate on load
  componentDidMount: function() {
    setTimeout(function() {
      document.getElementsByClassName('expand-menu')[0].classList.remove('preload');
    },1000)

  },

  render: function() {
    var orientation = (window.innerHeight > window.innerWidth) ? 'portrait' : 'landscape';

    return (
      <div className='expand'>
          <div className={this.state.open ? 'expand-toggle expand-menu-center expanded' : 'expand-toggle expand-menu-center'} onClick={this.toggle}>
            <div className={this.state.open ? 'mapMenuButton patty' : 'mapMenuButton hamburger'}></div>
          </div>
          <div className={this.state.open ? 'expand-menu animated open' : 'expand-menu animated bounceOutDown closeMenu preload'}>
              <div className={this.props.showOutcrop ? 'expand-menu-button expand-menu-center active' : 'expand-menu-button expand-menu-center'} onClick={this.toggleOutcrop}>
                <div className='outcrop mapMenuButton'></div>
              </div>
              <div className={this.props.showFossils ? 'expand-menu-button expand-menu-center active' : 'expand-menu-button expand-menu-center'} onClick={this.toggleFossils}>
                <div className='fossils mapMenuButton'></div>
              </div>
              <div className={this.props.showSatellite ? 'expand-menu-button expand-menu-center active' : 'expand-menu-button expand-menu-center'} onClick={this.toggleSatellite}>
                <div className='satellite mapMenuButton'></div>
              </div>

          </div>
      </div>
    );
  }
});

export default MenuToggle;

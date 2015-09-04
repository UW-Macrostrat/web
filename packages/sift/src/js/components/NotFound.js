import React from 'react';

class NotFound extends React.Component {
  render() {
    return (
      <div className="test">
        <h1>Sorry, page not found</h1>
      </div>
    );
  }
}

NotFound.contextTypes = {
  router: React.PropTypes.func.isRequired
}

export default NotFound;

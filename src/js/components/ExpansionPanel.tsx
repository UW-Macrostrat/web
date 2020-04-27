/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import React, {Component} from 'react';
import {Collapse, Button, Icon} from '@blueprintjs/core';

class ExpansionPanelSummary extends Component {
  // Shim to do things the Material UI way
  render() {
    const {expanded, children, onChange} = this.props;
    const showExpand = expanded ? 'chevron-up' : 'chevron-down';
    return <div className="expansion-panel-header" onClick={onChange}>
      <div className="title">{children}</div>
      <Icon icon={showExpand} />
    </div>;
  }
}

class ExpansionPanelDetails extends Component {
  render() {
    return <div>{this.props.children}</div>;
  }
}

class ExpansionPanel extends Component {
  /*
   * A basic expansion panel component built to mimic the API
   * of the corresponding Material UI component
   */
  constructor(props){
    super(props);
    // If we don't provide an onChange method,
    // the component is set up to be an un-managed one
    // (i.e. keeps track of its own open/closed state)
    this.state = {managed: (typeof onChange === 'undefined' || onChange === null)};
    this.state.expanded = props.expanded || false;
  }

  render() {

    let {onChange, title, children, expanded} = this.props;

    // Basic methods for an unmanaged component
    if (!this.state.managed) {
      ({
        expanded
      } = this.state);
      onChange = () => this.setState({expanded: !expanded});
    }

    const newChildren = [];
    for (let c of Array.from(children)) {
      if (c.type === ExpansionPanelSummary) {
        title = React.cloneElement(c, {expanded, onChange});
        continue;
      }
      newChildren.push(c);
    }

    // Title must be set on element
    if ((title == null)) {
      if (!React.isValidElement(title)) {
        title = <h4>{title}</h4>;
      }
      title = (
        <ExpansionPanelSummary expanded={expanded}>
          {title}
        </ExpansionPanelSummary>
      );
    }

    return (
      <div className="expansion-panel">
        {title}
        <Collapse isOpen={expanded}>{newChildren}</Collapse>
      </div>
    );
  }
}

export {ExpansionPanel, ExpansionPanelSummary, ExpansionPanelDetails};


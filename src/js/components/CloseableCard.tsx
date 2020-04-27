/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
/*
 * This closeable card is kind of like a dialog but inhabits the document tree
 */
import {Component, Children} from 'react';
import {Card, Button, Navbar, Alignment} from '@blueprintjs/core';
import h from 'react-hyperscript';

class CloseableCardHeader extends Component {
  render() {
    return h('div.card-header-left', this.props);
  }
}

class CloseableCard extends Component {
  static initClass() {
    this.Header = CloseableCardHeader;
  }
  // need to implement click outside dismisses
  render() {
    let {isOpen, onClose, title, transitionDuration, children, ...rest} = this.props;
    if (!isOpen) { return null; }
    rest.className = "closeable-card";

    // Set header from "CloseableCardHeader" unless  not set,
    // otherwise use "title"
    let header = null;
    const newChildren = Children.map(children, function(c){
      if (c.type === CloseableCardHeader) {
        header = c;
        return null;
      }
      return c;
    });

    if ((header == null)) {
      if (title != null) { title = h('h4', title); }
      header = h(CloseableCardHeader, [title]);
    }

    return h(Card, rest, [
      h('div.card-header', [
        header,
        h(Button, {icon: 'small-cross', minimal: true, 'aria-label': 'Close', onClick: onClose})
      ]),
      h('div.card-content', null, newChildren)
    ]);
  }
}
CloseableCard.initClass();

export {CloseableCard};

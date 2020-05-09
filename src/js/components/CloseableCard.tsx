import {Children} from 'react';
import {Card, Button} from '@blueprintjs/core';
import h from 'react-hyperscript';

const CloseableCardHeader = (props)=> h('div.card-header-left', props)

const CloseableCard = (props)=>{
  let {isOpen, onClose, title, transitionDuration, children, ...rest} = props;
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
      h(Button, {
        icon: 'small-cross',
        minimal: true,
        'aria-label': 'Close',
        onClick: onClose
      })
    ]),
    h('div.card-content', null, newChildren)
  ]);
}

CloseableCard.Header = CloseableCardHeader;

export {CloseableCard};

import React from 'react';
import Router from 'react-router';
import App from './components/App';

import Main from './components/Main';
import Unit from './components/Unit';
import Column from './components/Column';
import Group from './components/Group';
import StratName from './components/StratName';
import Lithology from './components/Lithology';
import Interval from './components/Interval';
import Environment from './components/Environment';
import Economic from './components/Economic';

import NotFound from './components/NotFound';

var { Route, DefaultRoute, RouteHandler, NotFoundRoute, Link } = Router;

var SiftRouter = Router.create({
   scrollBehavior: Router.ScrollToTopBehavior,
   routes:  (
     <Route handler={App}>
       <DefaultRoute path='' handler={Main}/>
       <Route name='unit' path='unit/:id' handler={Unit}/>
       <Route name='column' path='column/:id' handler={Column} addHandlerKey={true}/>
       <Route name='group' path='group/:id' handler={Group} addHandlerKey={true}/>
       <Route name='strat_name_concept' path='strat_name_concept/:id' handler={StratName}/>
       <Route name='strat_name' path='strat_name/:id' handler={StratName}/>
       <Route name='lithology' path='lithology/:id' handler={Lithology}/>
       <Route name='interval' path='interval/:id' handler={Interval}/>
       <Route name='environment' path='environment/:id' handler={Environment}/>
       <Route name='economic' path='economic/:id' handler={Economic}/>

       <NotFoundRoute handler={NotFound} />
     </Route>
   )
});

SiftRouter.run(function (Handler) {
  React.render(<Handler/>, document.getElementsByClassName('react')[0]);
});

//React.render(<App/>, document.getElementsByClassName('react')[0]);

import React from 'react';
import { Route, IndexRoute } from 'react-router';

import App from './components/App';
import Upload from './components/Upload';
import Node from './containers/Node';
import NodeSearch from './components/NodeSearch';

export default (
  <Route path="/" component={App}>
    <IndexRoute component={Upload}/>
    <Route path="nodes/:hash" component={Node}/>
    <Route path="nodes" component={NodeSearch}/>
  </Route>
);

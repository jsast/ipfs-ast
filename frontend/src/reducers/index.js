// Set up your root reducer here...
import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';

import testReducer from './testReducer';
import nodeReducer from './nodeReducer';

const rootReducer = combineReducers({
  routing: routerReducer,
  nodes: nodeReducer,
  testReducer
});

export default rootReducer;

import * as types from '../constants/actionTypes';
import { pick } from 'ramda';

import update from 'react-addons-update'; // ES6

export default function nodeReducer(state = {}, action) {
  switch (action.type) {
    case types.SET_LOADING:
      return update(state, {
        [action.hash]: {
          $set: { status: 'loading' }
        }
      });
    case types.SET_FAILED:
      return update(state, {
        [action.hash]: {
          $set: { status: 'failed' }
        }
      });
    case types.ADD_NODE:
      return update(state, {
        [action.hash]: {
          $set: {
            status: 'loaded',
            hash: action.hash,
            data: action.data,
            links: action.links,
          }
        }
      });
    default:
      return state
  }
}

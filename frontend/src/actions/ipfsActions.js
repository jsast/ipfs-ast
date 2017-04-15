import * as types from '../constants/actionTypes';
import ipfsAPI from 'ipfs-api';
const ipfs = ipfsAPI('localhost', '5001', { protocol: 'http' });

export function loadNode(hash) {
  console.log("loading")
  return (dispatch) => {
    console.log("dispatched")
    dispatch({
      type: types.SET_LOADING,
      hash: hash
    })

    ipfs.object.get(hash, (err, rawNode) => {
      if (err) {
        dispatch({
          type: types.SET_FAILED,
          hash: hash
        });
      } else {
        const node = rawNode.toJSON();
        dispatch({
          type: types.ADD_NODE,
          hash: hash,
          data: node.data,
          links: node.links,
        });
      }
    })
  }
}

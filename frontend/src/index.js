/* eslint-disable import/default */

import React from 'react';
import { render } from 'react-dom';
import { browserHistory } from 'react-router';
import { AppContainer } from 'react-hot-loader';
import Root from './components/Root';

import configureStore from './store/configureStore';
// require('./favicon.ico'); // Tell webpack to load favicon.ico
import './styles/styles.sass';
import { syncHistoryWithStore } from 'react-router-redux';

// import IPFS from 'ipfs';
import ipfsAPI from 'ipfs-api';
const node = ipfsAPI('localhost', '5001', {protocol: 'http'});

import IpfsAST from '../../core/main';

const store = configureStore();

// Create an enhanced history that syncs navigation events with the store
const history = syncHistoryWithStore(browserHistory, store);

// TODO: For some reason ipfs.object.put works
// but ipfs.object.get does not.
//
// For now, just use the ipfs-api version
//
// const node = new IPFS({
//   repo: String(Math.random()),
//   init: true,
//   start: true,
//   EXPERIMENTAL: {
//     pubsub: false
//   },
//   // SEE: https://github.com/ipfs/js-ipfs/issues/800
//   // For now, we need to run a websocket peer in the background
//   config: {
//     Bootstrap: [
//       "/ip4/127.0.0.1/tcp/9999/ws/ipfs/QmdbdG2Pa6GAWwTVgEK1cstdrWqNLAtxyi8wfSWN8Awz8P",
//     ]
//   }
// });
// // TODO: Find a more elegant way to keep track of the ipfs connection
// node.on('ready', () => {
//   setInterval(() => {
//     node.swarm.peers(function (err, peerInfos) {
//       console.dir(peerInfos)
//     })
//   }, 10000);

//   const ipfsAST = new IpfsAST(node);
//   render(
//     <AppContainer>
//       <Root store={store} history={history} ipfs={ipfsAST} />
//     </AppContainer>,
//     document.getElementById('app')
//   );
// });

const ipfsAST = new IpfsAST(node);
render(
  <AppContainer>
    <Root store={store} history={history} ipfs={ipfsAST} />
  </AppContainer>,
  document.getElementById('app')
);

if (module.hot) {
  module.hot.accept('./components/Root', () => {
    const NewRoot = require('./components/Root').default;
    render(
      <AppContainer>
        <NewRoot store={store} history={history} />
      </AppContainer>,
      document.getElementById('app')
    );
  });
}

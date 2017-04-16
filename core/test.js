const ipfsAPI = require('ipfs-api');
const node = ipfsAPI('localhost', '5001', {protocol: 'http'});

const IpfsAST = require('./main');
const ipfsAST = new IpfsAST(node);

ipfsAST.loadGraph({ name: 'root', multihash: 'QmNtErfcxheFfEGePdEBQZvkVXa23NApYefB4TnjgwxCDX' }).then(({nodes, edges}) => {
  console.log(nodes);
  console.log(edges);
}).catch((err) => {
  throw err
});

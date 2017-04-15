# IPFS-AST

## Core

* [x] Converte source code to nested (data, links) pairs (and back)
* [x] Store / load those pairs as / from IPFS objects


### Usage

``` js
// Create an IPFS object, using 'js-ipfs' instead of the API should work, too
const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});

// Adapt the path
const IpfsAST = require('../../ipfs-ast/main.js');

// Create a IpfsAST object
const ipfsAST = new IpfsAST(ipfs);

// Load code for a hash (w/ Promises)
ipfsAST.loadCode(hash).then(({ code, node }) => {
  console.log(code);
}).catch(err => {
  throw err;
})

// Store code (takes a string w/ code & the DAGNode object of the root object)
ipfsAST.storeCode("console.log(1 + 1)").then(node => {
  console.log("The hash of the root object is " + node.Hash);
}).catch(err => {
  throw err;
});
```

## Frontend

* [x] Generate an AST and store it in a local IPFS repo
* [x] Load an AST from a IPFS hash and convert it back to source code
* [ ] Visualize the AST / object graph

## Backend

* [ ] Pin uploaded objects
* [ ] Provide a fallback API to store / get objects
  if the IPFS network is to slow
* [ ] List all pinned objects + source code

## Visualize

* Create the `.dot` file: `ruby viz.rb $hash`
* Render it to a `.png`: `dot -Tpng output.dot -o output.png`

'use strict';

const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});

const IpfsAST = require('../../ipfs-ast/main.js');
const ipfsAST = new IpfsAST(ipfs);

exports.get = (ctx) => new Promise((resolve, reject) => {
  const hash = ctx.params.hash;
  ipfsAST.loadCode(hash).then(({ code, node }) => {
    return ctx.render('node', {
      hash: hash,
      data: node.data.toString(),
      code: code
    });
  }).catch(err => {
    ctx.body = { error: err.message };
  }).then(resolve).catch(err => {
    ctx.body = { error: err.message };
  })
});

exports.download = (ctx) => new Promise((resolve, reject) => {
  const hash = ctx.params.hash;
  ipfsAST.loadCode(hash).then(({ code, node }) => {
    ctx.body = new Buffer(code);
  }).catch(err => {
    ctx.body = { error: err.message };
  }).then(resolve);
});

// exports.get = (ctx, next) => new Promise((resolve, reject) => {
//   const hash = ctx.params.hash;
//   ctx.render('node', { hash: hash }).then(resolve);
// });

import ipfsAPI from 'ipfs-api';
import fs from 'fs';
import esprima from 'esprima';
import escodegen from 'escodegen';
import { pick, sortBy, prop } from 'ramda';
const ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
import async from 'async';

// NOTE: Links w/ different names but the same ref
// appear only once in the webinterface

// To simplify the recursive calls to `storeLink`
// this function always expects an AST-Link
// `{ name: ..., node: ... }`
// as input
// and returns an IPFS-Link
// `{ Name: ..., Size: ..., Hash: ... }`.
//
// To store the root AST-Node,
// just pass in `{ name: 'root', node: node }`
function storeLink({ name, node }) {
  // Process the AST-Node
  // to get its data and links (to other AST-Nodes)
  const { data, links } = exportNode(node);

  return Promise.all(
    // recursively call storeLink on all links,
    links.map(storeLink)
  ).then(ipfsLinks => {
    // create an ipfs object
    // w/ data and the IPFS-links from the previous step
    return ipfs.object.put({
      Data: JSON.stringify(data),
      Links: ipfsLinks
    })
  }).then(ipfsNode => {
    // then return a valid DAGLink object
    return {
      Name: name,
      Size: ipfsNode.size,
      Hash: ipfsNode.toJSON().multihash,
    };
  })
}

function isArrayKey(key) {
  return key.indexOf("[") > -1;
}

function parseArrayKey(key) {
  const pos = key.indexOf("[");

  return {
    baseName: key.slice(0, pos),
    index: Number.parseInt(key.slice(pos + 1, -1))
  }
}

// To read arrays from the links (random order, `body[5]`, `body[2]`, ...),
// first collect all links to a given array
// ```
// { body: [
//   { index: 5, node: ...},
//   { index: 2, node: ...},
// ]}
// ```
// and then, after parsing all links,
// sort them by `index` and keep only `node`
function loadLink({ name, multihash }) {
  return ipfs.object.get(multihash).then(node_ => {

    const node = node_.toJSON();

    // TODO: Errors in this promise are not passed to the outer promise
    return Promise.all(
      node.links.map(loadLink)
    ).then(links => {
      const data = JSON.parse(node.data);
      const arrays = [];

      links.forEach(({ name, node }) => {
        if (isArrayKey(name)) {
          const { baseName, index } = parseArrayKey(name);

          if (data.hasOwnProperty(baseName)) {
            data[baseName].push({ index, node });
          } else {
            data[baseName] = [{ index, node }];
            arrays.push(baseName);
          }
        } else {
          data[name] = node;
        }
      });

      arrays.forEach(baseName => {
        const old = data[baseName];
        data[baseName] = sortBy(prop('index'), old).map(prop('node'))
      })

      // if (data.type == 'ReturnStatement') {
        // data.argument = null;
      // // } else if (data.type == 'BlockStatement') {
        // data.handler = null;
        // data.finalizer = null;
        // data.init = null;
        // data.id = null;
      // // }

      return { name, node: data };
    // TODO: Errors in this promise are not passed to the outer promise
    }).catch(err => {
      throw err;
    });
  });
}

// NOTE: There are some special cases
// where the values of the linkKeys
// need to be stored in the node data,
// e.g. if an array is empty
// or a value is null
function makeExporter(dataKeys, linkKeys) {
  return (node) => {
    const links = []
    const data =  pick(['type', ...dataKeys], node);

    linkKeys.forEach(key => {
      const value = node[key]
      if (value instanceof Array) {
        if (value.length == 0) {
          data[key] = [];
        } else {
          const newLinks = value.map((e, i) => ({ name: `${key}[${i}]`, node: e }));
          links.push(...newLinks);
        }
      } else if (value != null) {
        links.push({ name: key, node: value })
      } else {
        data[key] = null;
      }
    })

    return { data, links }
  }
}

const exporters = {
  'Program':             makeExporter(['sourceType'], ['body']),
  // TODO: Handle `regex?`
  'Literal':             makeExporter(['value', 'raw'], []),
  'ThisExpression':      makeExporter([], []),
  'Identifier':   makeExporter(['name'], []),
  'Super':   makeExporter([], []),
  'Import':   makeExporter([], []),
  'ArrayPattern':   makeExporter([], ['elements']),
  'RestElement':   makeExporter([], ['argument']),
  'AssignmentPattern':   makeExporter([], ['left', 'right']),
  'ObjectPattern':   makeExporter([], ['properties']),
  'ArrayExpression':   makeExporter([], ['elements']),
  'ObjectExpression':   makeExporter([], ['properties']),
  'Property':   makeExporter(['computed', 'kind', 'method', 'shorthand'], ['key', 'value']),
  'FunctionExpression':   makeExporter(['generator', 'async', 'expression'], ['id', 'params', 'body']),
  'ArrowFunctionExpression':   makeExporter(['generator', 'async', 'expression'], ['id', 'params', 'body']),
  'ClassExpression':   makeExporter([], ['id', 'superClass', 'body']),
  'ClassBody':   makeExporter([], ['body']),
  'MethodDefinition':   makeExporter(['computed', 'kind', 'static'], ['key', 'value']),
  'TaggedTemplateExpression':   makeExporter([], ['readonly tag', 'readonly quasi']),
  'TemplateElement':   makeExporter(['value', 'tail'], []),
  'TemplateLiteral':   makeExporter([], ['quasis', 'expressions']),
  'MemberExpression':   makeExporter(['computed'], ['object', 'property']),
  'MetaProperty':   makeExporter([], ['meta', 'property']),
  'CallExpression':   makeExporter([], ['callee', 'arguments']),
  'NewExpression':   makeExporter([], ['callee', 'arguments']),
  'SpreadElement':   makeExporter([], ['argument']),
  'UpdateExpression':   makeExporter(['operator', 'prefix'], ['argument']),
  'AwaitExpression':   makeExporter([], ['argument']),
  'UnaryExpression':   makeExporter(['operator', 'prefix'], ['argument']),
  'BinaryExpression':    makeExporter(['operator'], ['left', 'right']),
  'LogicalExpression':    makeExporter(['operator'], ['left', 'right']),
  // TODO: Handle / test optional `alternate?`
  'ConditionalExpression':   makeExporter([], ['test', 'consequent', 'alternate']),
  'YieldExpression':   makeExporter(['delegate'], ['argument']),
  'AssignmentExpression':   makeExporter(['operator'], ['left', 'right']),
  'SequenceExpression':   makeExporter([], ['expressions']),
  'BlockStatement':   makeExporter([], ['body']),
  'BreakStatement':   makeExporter([], ['label']),
  'ClassDeclaration':   makeExporter([], ['id', 'superClass', 'body']),
  'ContinueStatement':   makeExporter([], ['label']),
  'DebuggerStatement':   makeExporter([], []),
  'DoWhileStatement':   makeExporter([], ['body', 'test']),
  'EmptyStatement':   makeExporter([], []),
  'ExpressionStatement': makeExporter([], ['expression']),
  'ForStatement':   makeExporter([], ['init', 'test', 'update', 'body']),
  'ForInStatement':   makeExporter(['each'], ['left', 'right', 'body']),
  'ForOfStatement':   makeExporter([], ['left', 'right', 'body']),
  'FunctionDeclaration':   makeExporter(['generator', 'async', 'expression'], ['id', 'params', 'body']),
  // TODO: Handle / test optional `alternate?`
  'IfStatement':   makeExporter([], ['test', 'consequent', 'alternate']),
  'LabeledStatement':   makeExporter([], ['label', 'body']),
  'ReturnStatement':   makeExporter([], ['argument']),
  'SwitchStatement':   makeExporter([], ['discriminant', 'cases']),
  'SwitchCase':   makeExporter([], ['test', 'consequent']),
  'ThrowStatement':   makeExporter([], ['argument']),
  'TryStatement':   makeExporter([], ['block', 'handler', 'finalizer']),
  'CatchClause':   makeExporter([], ['param', 'body']),
  'VariableDeclaration':   makeExporter(['kind'], ['declarations']),
  'VariableDeclarator':   makeExporter([], ['id', 'init']),
  'WhileStatement':   makeExporter([], ['test', 'body']),
  'WithStatement':   makeExporter([], ['object', 'body']),
  // TODO: Handle / test optional `imported?`
  'ImportSpecifier':   makeExporter([], ['local', 'imported']),
  // TODO: Handle / test optional `imported?`
  'ImportDefaultSpecifier':   makeExporter([], ['local', 'imported']),
  // TODO: Handle / test optional `imported?`
  'ImportNamespaceSpecifier':   makeExporter([], ['local', 'imported']),
  'ExportAllDeclaration':   makeExporter([], ['source']),
  'ExportDefaultDeclaration':   makeExporter([], ['declaration']),
  'ExportNamedDeclaration':   makeExporter([], ['declaration', 'specifiers', 'source']),
  'ExportSpecifier':   makeExporter([], ['exported', 'local']),
  'ImportDeclaration':   makeExporter([], ['specifiers', 'source']),
}

// NOTE: This does not return valid DAGNodes!
// NOTE: 'type' is always added by convertNode

var nodes = 0

function exportNode(node) {
  const exporter = exporters[node.type];
  if (exporter != undefined) {
    nodes += 1
    return exporter(node)
  } else {
    throw 'Unknown node type: ' + node.type;
  }
}

function storeFile(filename) {
  fs.readFile(filename, 'utf8', function(err, data) {
    if (err) {
      throw err;
    }

    let program = esprima.parse(data, { sourceType: 'module' });

    storeLink({ name: 'root', node: program }).then(node => { 
      console.log("Nodes: " + nodes)
      console.log(node.Hash);
      
      // TODO: Just for debugging purposes,
      // load the file back in
      loadFile(node.Hash, 'output.js')
    }).catch(err => {
      throw err;
    })
  });
}

function loadFile(hash, filename) {
  loadLink({ name: 'root', multihash: hash }).then(node => {

    // console.log(JSON.stringify(node.node, null, 2))
    console.log(escodegen.generate(node.node));
  }).catch(err => {
    throw err;
  })
}

storeFile('input.js')

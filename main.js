import ipfsAPI from 'ipfs-api';
import fs from 'fs';
import esprima from 'esprima';
import { pick } from 'ramda';
const ipfs = ipfsAPI('localhost', '5001', {protocol: 'http'});
import async from 'async';

// NOTE: Links w/ different names but the same ref
// appear only once in the webinterface

// TODO: Refactor to use promises
function storeNode(node, cb) {
  const { data, links } = processNode(node);

  async.map(links, (link, callback) => {
    const { name, item } = link;

    storeNode(item, (err, res) => {
      if (err) {
        return callback(err);
      }

      return callback(null, {
        Name: name,
        Size: res.size,
        Hash: res.toJSON().multihash,
      });
    });
  }, (err, link_nodes) => {
    if (err) {
      return cb(err);
    }

    ipfs.object.put({
      Data: JSON.stringify(data),
      Links: link_nodes
    }, cb);
  });
}

function processArray(key, array) {
}

function makeProcessor(dataKeys, linkKeys) {
  return (node) => {
    const links = []

    linkKeys.forEach(key => {
      const value = node[key]
      if (value instanceof Array) {
        const newLinks = value.map((e, i) => ({ name: `${key}[${i}]`, item: e }));
        links.push(...newLinks)
      } else if (value != null) {
        links.push({ name: key, item: value })
      }
    })

    return {
      data: pick(['type', ...dataKeys], node),
      links: links,
    }
  }
}

const processors = {
  'Program':             makeProcessor(['sourceType'], ['body']),
  // TODO: Handle `regex?`
  'Literal':             makeProcessor(['value', 'raw'], []),
  'ThisExpression':      makeProcessor([], []),
  'Identifier':   makeProcessor(['name'], []),
  'Super':   makeProcessor([], []),
  'Import':   makeProcessor([], []),
  'ArrayPattern':   makeProcessor([], ['elements']),
  'RestElement':   makeProcessor([], ['argument']),
  'AssignmentPattern':   makeProcessor([], ['left', 'right']),
  'ObjectPattern':   makeProcessor([], ['properties']),
  'ArrayExpression':   makeProcessor([], ['elements']),
  'ObjectExpression':   makeProcessor([], ['properties']),
  'Property':   makeProcessor(['computed', 'kind', 'method', 'shorthand'], ['key', 'value']),
  'FunctionExpression':   makeProcessor(['generator', 'async', 'expression'], ['id', 'params', 'body']),
  'ArrowFunctionExpression':   makeProcessor(['generator', 'async', 'expression'], ['id', 'params', 'body']),
  'ClassExpression':   makeProcessor([], ['id', 'superClass', 'body']),
  'ClassBody':   makeProcessor([], ['body']),
  'MethodDefinition':   makeProcessor(['computed', 'kind', 'static'], ['key', 'value']),
  'TaggedTemplateExpression':   makeProcessor([], ['readonly tag', 'readonly quasi']),
  'TemplateElement':   makeProcessor(['value', 'tail'], []),
  'TemplateLiteral':   makeProcessor([], ['quasis', 'expressions']),
  'MemberExpression':   makeProcessor(['computed'], ['object', 'property']),
  'MetaProperty':   makeProcessor([], ['meta', 'property']),
  'CallExpression':   makeProcessor([], ['callee', 'arguments']),
  'NewExpression':   makeProcessor([], ['callee', 'arguments']),
  'SpreadElement':   makeProcessor([], ['argument']),
  'UpdateExpression':   makeProcessor(['operator', 'prefix'], ['argument']),
  'AwaitExpression':   makeProcessor([], ['argument']),
  'UnaryExpression':   makeProcessor(['operator', 'prefix'], ['argument']),
  'BinaryExpression':    makeProcessor(['operator'], ['left', 'right']),
  'LogicalExpression':    makeProcessor(['operator'], ['left', 'right']),
  // TODO: Handle / test optional `alternate?`
  'ConditionalExpression':   makeProcessor([], ['test', 'consequent', 'alternate']),
  'YieldExpression':   makeProcessor(['delegate'], ['argument']),
  'AssignmentExpression':   makeProcessor(['operator'], ['left', 'right']),
  'SequenceExpression':   makeProcessor([], ['expressions']),
  'BlockStatement':   makeProcessor([], ['body']),
  'BreakStatement':   makeProcessor([], ['label']),
  'ClassDeclaration':   makeProcessor([], ['id', 'superClass', 'body']),
  'ContinueStatement':   makeProcessor([], ['label']),
  'DebuggerStatement':   makeProcessor([], []),
  'DoWhileStatement':   makeProcessor([], ['body', 'test']),
  'EmptyStatement':   makeProcessor([], []),
  'ExpressionStatement': makeProcessor([], ['expression']),
  'ForStatement':   makeProcessor([], ['init', 'test', 'update', 'body']),
  'ForInStatement':   makeProcessor(['each'], ['left', 'right', 'body']),
  'ForOfStatement':   makeProcessor([], ['left', 'right', 'body']),
  'FunctionDeclaration':   makeProcessor(['generator', 'async', 'expression'], ['id', 'params', 'body']),
  // TODO: Handle / test optional `alternate?`
  'IfStatement':   makeProcessor([], ['test', 'consequent', 'alternate']),
  'LabeledStatement':   makeProcessor([], ['label', 'body']),
  'ReturnStatement':   makeProcessor([], ['argument']),
  'SwitchStatement':   makeProcessor([], ['discriminant', 'cases']),
  'SwitchCase':   makeProcessor([], ['test', 'consequent']),
  'ThrowStatement':   makeProcessor([], ['argument']),
  'TryStatement':   makeProcessor([], ['block', 'handler', 'finalizer']),
  'CatchClause':   makeProcessor([], ['param', 'body']),
  'VariableDeclaration':   makeProcessor(['kind'], ['declarations']),
  'VariableDeclarator':   makeProcessor([], ['id', 'init']),
  'WhileStatement':   makeProcessor([], ['test', 'body']),
  'WithStatement':   makeProcessor([], ['object', 'body']),
  // TODO: Handle / test optional `imported?`
  'ImportSpecifier':   makeProcessor([], ['local', 'imported']),
  // TODO: Handle / test optional `imported?`
  'ImportDefaultSpecifier':   makeProcessor([], ['local', 'imported']),
  // TODO: Handle / test optional `imported?`
  'ImportNamespaceSpecifier':   makeProcessor([], ['local', 'imported']),
  'ExportAllDeclaration':   makeProcessor([], ['source']),
  'ExportDefaultDeclaration':   makeProcessor([], ['declaration']),
  'ExportNamedDeclaration':   makeProcessor([], ['declaration', 'specifiers', 'source']),
  'ExportSpecifier':   makeProcessor([], ['exported', 'local']),
  'ImportDeclaration':   makeProcessor([], ['specifier', 'source']),
}

// NOTE: This does not return valid DAGNodes!
// NOTE: 'type' is always added by convertNode

var nodes = 0

function processNode(node) {
  const processor = processors[node.type];
  if (processor != undefined) {
    nodes += 1
    return processor(node)
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

    storeNode(program, (err, node) => {
      if (err) {
        throw err;
      }
      console.log("Nodes: " + nodes)
      console.log(node.toJSON().multihash);
    })

  });
}

storeFile('input.js')

const esprima = require('esprima');
const escodegen = require('escodegen');
const R = require('ramda');

const async = require('async');

function IpfsAst(ipfs) {
  this.ipfs = ipfs;

  this.getObject = this.ipfs.object.get;
  this.putObject = this.ipfs.object.put;

  // NOTE: Links w/ different names but the same ref
  // appear only once in the webinterface

  // To simplify the recursive calls to `storeLink`
  // this function always expects an AST-Link
  // `{ name: ..., node: <raw node>, data: <processed node data> }`
  // as input
  // and returns an IPFS-Link
  // `{ Name: ..., Size: ..., Hash: ... }`.
  //
  // To store the root AST-Node,
  // just pass in `{ name: 'root', node: node }`

  this.storeLink = ({ name, node }) => {
    // Process the AST-Node
    // to get its data and links (to other AST-Nodes)
    const { data, links } = this.exportNode(node);

    return Promise.all(
      // recursively call storeLink on all links,
      links.map(this.storeLink)
    ).then(ipfsLinks => {
      // create an ipfs object
      // w/ data and the IPFS-links from the previous step
      return this.putObject({
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
  };

  this.isArrayKey = (key) => key.indexOf("[") > -1;


  this.parseArrayKey = (key) => {
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
  this.loadLink = ({ name, multihash }) => {
    return this.getObject(multihash).then(node_ => {
      const node = node_.toJSON();

      // TODO: Errors in this promise are not passed to the outer promise
      return Promise.all(
          node.links.map(this.loadLink)
          ).then(links => {
        const data = JSON.parse(node.data);
        const arrays = [];

        links.forEach(({ name, data: linkData }) => {
          if (this.isArrayKey(name)) {
            const { baseName, index } = this.parseArrayKey(name);

            if (data.hasOwnProperty(baseName)) {
              data[baseName].push({ index, data: linkData });
            } else {
              data[baseName] = [{ index, data: linkData }];
              arrays.push(baseName);
            }
          } else {
            data[name] = linkData;
          }
        });

        arrays.forEach(baseName => {
          const old = data[baseName];
          data[baseName] = R.sortBy(R.prop('index'), old).map(R.prop('data'))
        })

        return { name, data, node };
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
  this.makeExporter = (dataKeys, linkKeys) => {
    return (node) => {
      const links = []
        const data =  R.pick(['type', ...dataKeys], node);

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

  this.exporters = {
    'Program':             this.makeExporter(['sourceType'], ['body']),
    // TODO: Handle `regex?`
    'Literal':             this.makeExporter(['value', 'raw'], []),
    'ThisExpression':      this.makeExporter([], []),
    'Identifier':   this.makeExporter(['name'], []),
    'Super':   this.makeExporter([], []),
    'Import':   this.makeExporter([], []),
    'ArrayPattern':   this.makeExporter([], ['elements']),
    'RestElement':   this.makeExporter([], ['argument']),
    'AssignmentPattern':   this.makeExporter([], ['left', 'right']),
    'ObjectPattern':   this.makeExporter([], ['properties']),
    'ArrayExpression':   this.makeExporter([], ['elements']),
    'ObjectExpression':   this.makeExporter([], ['properties']),
    'Property':   this.makeExporter(['computed', 'kind', 'method', 'shorthand'], ['key', 'value']),
    'FunctionExpression':   this.makeExporter(['generator', 'async', 'expression'], ['id', 'params', 'body']),
    'ArrowFunctionExpression':   this.makeExporter(['generator', 'async', 'expression'], ['id', 'params', 'body']),
    'ClassExpression':   this.makeExporter([], ['id', 'superClass', 'body']),
    'ClassBody':   this.makeExporter([], ['body']),
    'MethodDefinition':   this.makeExporter(['computed', 'kind', 'static'], ['key', 'value']),
    'TaggedTemplateExpression':   this.makeExporter([], ['readonly tag', 'readonly quasi']),
    'TemplateElement':   this.makeExporter(['value', 'tail'], []),
    'TemplateLiteral':   this.makeExporter([], ['quasis', 'expressions']),
    'MemberExpression':   this.makeExporter(['computed'], ['object', 'property']),
    'MetaProperty':   this.makeExporter([], ['meta', 'property']),
    'CallExpression':   this.makeExporter([], ['callee', 'arguments']),
    'NewExpression':   this.makeExporter([], ['callee', 'arguments']),
    'SpreadElement':   this.makeExporter([], ['argument']),
    'UpdateExpression':   this.makeExporter(['operator', 'prefix'], ['argument']),
    'AwaitExpression':   this.makeExporter([], ['argument']),
    'UnaryExpression':   this.makeExporter(['operator', 'prefix'], ['argument']),
    'BinaryExpression':    this.makeExporter(['operator'], ['left', 'right']),
    'LogicalExpression':    this.makeExporter(['operator'], ['left', 'right']),
    // TODO: Handle / test optional `alternate?`
    'ConditionalExpression':   this.makeExporter([], ['test', 'consequent', 'alternate']),
    'YieldExpression':   this.makeExporter(['delegate'], ['argument']),
    'AssignmentExpression':   this.makeExporter(['operator'], ['left', 'right']),
    'SequenceExpression':   this.makeExporter([], ['expressions']),
    'BlockStatement':   this.makeExporter([], ['body']),
    'BreakStatement':   this.makeExporter([], ['label']),
    'ClassDeclaration':   this.makeExporter([], ['id', 'superClass', 'body']),
    'ContinueStatement':   this.makeExporter([], ['label']),
    'DebuggerStatement':   this.makeExporter([], []),
    'DoWhileStatement':   this.makeExporter([], ['body', 'test']),
    'EmptyStatement':   this.makeExporter([], []),
    'ExpressionStatement': this.makeExporter([], ['expression']),
    'ForStatement':   this.makeExporter([], ['init', 'test', 'update', 'body']),
    'ForInStatement':   this.makeExporter(['each'], ['left', 'right', 'body']),
    'ForOfStatement':   this.makeExporter([], ['left', 'right', 'body']),
    'FunctionDeclaration':   this.makeExporter(['generator', 'async', 'expression'], ['id', 'params', 'body']),
    // TODO: Handle / test optional `alternate?`
    'IfStatement':   this.makeExporter([], ['test', 'consequent', 'alternate']),
    'LabeledStatement':   this.makeExporter([], ['label', 'body']),
    'ReturnStatement':   this.makeExporter([], ['argument']),
    'SwitchStatement':   this.makeExporter([], ['discriminant', 'cases']),
    'SwitchCase':   this.makeExporter([], ['test', 'consequent']),
    'ThrowStatement':   this.makeExporter([], ['argument']),
    'TryStatement':   this.makeExporter([], ['block', 'handler', 'finalizer']),
    'CatchClause':   this.makeExporter([], ['param', 'body']),
    'VariableDeclaration':   this.makeExporter(['kind'], ['declarations']),
    'VariableDeclarator':   this.makeExporter([], ['id', 'init']),
    'WhileStatement':   this.makeExporter([], ['test', 'body']),
    'WithStatement':   this.makeExporter([], ['object', 'body']),
    // TODO: Handle / test optional `imported?`
    'ImportSpecifier':   this.makeExporter([], ['local', 'imported']),
    // TODO: Handle / test optional `imported?`
    'ImportDefaultSpecifier':   this.makeExporter([], ['local', 'imported']),
    // TODO: Handle / test optional `imported?`
    'ImportNamespaceSpecifier':   this.makeExporter([], ['local', 'imported']),
    'ExportAllDeclaration':   this.makeExporter([], ['source']),
    'ExportDefaultDeclaration':   this.makeExporter([], ['declaration']),
    'ExportNamedDeclaration':   this.makeExporter([], ['declaration', 'specifiers', 'source']),
    'ExportSpecifier':   this.makeExporter([], ['exported', 'local']),
    'ImportDeclaration':   this.makeExporter([], ['specifiers', 'source']),
  }

  // NOTE: This does not return valid DAGNodes!
  // NOTE: 'type' is always added by convertNode
  this.exportNode = (node) => {
    const exporter = this.exporters[node.type];
    if (exporter != undefined) {
      return exporter(node)
    } else {
      throw 'Unknown node type: ' + node.type;
    }
  }

  this.storeCode = (code) => {
    let program = esprima.parse(code, { sourceType: 'module' });
    return this.storeLink({ name: 'root', node: program });
  }

  // function storeFile(filename) {
  //   fs.readFile(filename, 'utf8', function(err, data) {
  //     if (err) {
  //       throw err;
  //     }

  //     let program = esprima.parse(data, { sourceType: 'module' });

  //     storeLink({ name: 'root', node: program }).then(node => { 
  //       console.log("Nodes: " + nodes)
  //       console.log(node.Hash);

  //       // TODO: Just for debugging purposes,
  //       // load the file back in
  //       loadFile(node.Hash, 'output.js')
  //     }).catch(err => {
  //       throw err;
  //     })
  //   });
  // }

  this.loadCode = (hash) => {
    return this.loadLink({ name: 'root', multihash: hash }).then(({ data, node }) => {
      const code = escodegen.generate(data);
      return { node, code };
    });
  }

  // function loadFile(hash, filename) {
  //   loadLink({ name: 'root', multihash: hash }).then(node => {

  //     // console.log(JSON.stringify(node.node, null, 2))
  //     console.log(escodegen.generate(node.node));
  //   }).catch(err => {
  //     throw err;
  //   })
  // }
}

module.exports = IpfsAst;

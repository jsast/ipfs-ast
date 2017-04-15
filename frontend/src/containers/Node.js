import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Link } from 'react-router';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { monokai } from 'react-syntax-highlighter/dist/styles';
import FileSaver from 'file-saver';

import ipfsAPI from 'ipfs-api';
const ipfs = ipfsAPI('localhost', '5001', { protocol: 'http' });

import * as ipfsActions from '../actions/ipfsActions';

import { loadCode } from '../../../ipfs-ast/main';

class Node extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      state: 'Not loaded',
      node: null,
      code: ''
    }

    this.loadNodeIfNecessary(props);
    this.handleExport = this.handleExport.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.loadNodeIfNecessary(nextProps);
  }

  loadNodeIfNecessary(props) {
    const { node } = this.state;
    const { hash } = props.params;

    if (!node || node.hash != hash) {
      ipfs.object.get(hash, (err, rawNode) => {
        if (err) {
          this.setState({ state: 'Failed' })
        } else {
          const node = rawNode.toJSON();

          this.setState({
            state: 'Loaded',
            node
          });

          loadCode(node.multihash).then(code => {
            this.setState({ code: code });
          });

          // TODO: Handle error
        }
      });
    }
  }

  handleExport() {
    const { node: { multihash }, code } = this.state;

    var blob = new Blob([code], {type: "octet/stream"});
    FileSaver.saveAs(blob, multihash+".js");
  }

  render() {
    const { node, state, code } = this.state;

    if (node) {
      if (state == "Loaded") {
        return (
          <div className="node">
            <h2>{ node.multihash }</h2>
            <div className="node__data">
              <ul>
                <li>Status: {state}</li>
                <li>Data: {node.data.toString()}</li>
                { node.links.length > 0 &&
                  <li>Links:
                    <ul>
                      {node.links.map(link =>
                        <li key={link.name + link.multihash}>
                          <Link to={"/nodes/" + link.multihash}>{link.name}</Link>
                        </li>
                      )}
                    </ul>
                  </li> }
              </ul>
            </div>
            <div className="node__code">
              <SyntaxHighlighter language="javascript" style={monokai}>{ code }</SyntaxHighlighter>
            </div>
            <button onClick={this.handleExport}>Download</button>
          </div>
        );
      } else {
        return (
          <div className="node">
            <ul>
              <li>Status: {state}</li>
            </ul>
          </div>
        );
      }
    } else {
      return <h2>No node with this hash</h2>;
    }
  }
}

function mapStateToProps(state, ownProps) {
  return {
    node: state.nodes[ownProps.params.hash]
  };
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(ipfsActions, dispatch)
  };
}


export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Node);

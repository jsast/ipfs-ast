import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Link } from 'react-router';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { monokai } from 'react-syntax-highlighter/dist/styles';
import FileSaver from 'file-saver';
import Graph from 'react-graph-vis';

// TODO: Is this needed for ipfs to work correctly?
import 'setimmediate';

class Node extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      state: 'Not loaded',
      node: null,
      code: '',
      nodes: [],
      edges: [],
    }

    this.loadNodeIfNecessary = this.loadNodeIfNecessary.bind(this);
    this.handleExport = this.handleExport.bind(this);
  }

  componentDidMount() {
    this.loadNodeIfNecessary(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.loadNodeIfNecessary(nextProps);
  }

  loadNodeIfNecessary(props) {
    const { node } = this.state;
    const { hash } = props.params;

    if (!node || node.hash != hash) {

      this.context.ipfs.loadGraph({ name: 'root', multihash: hash }, 3).then(({nodes, edges}) => {
        this.setState({ nodes, edges });
      }).catch((err) => {
        throw err
      });

      console.log(this.context.ipfs.loadCode(hash).then(({ node, code }) => {
        this.setState({
          state: 'Loaded',
          node,
          code,
        });

      }).catch(err => {
        console.log(err.message);
        this.setState({ state: 'Failed' })
      }));
    }
  }

  handleExport() {
    const { node: { multihash }, code } = this.state;

    const blob = new Blob([code], {type: "octet/stream"});
    FileSaver.saveAs(blob, multihash+".js");
  }

  render() {
    const { node, state, code, nodes, edges } = this.state;
    const graph = { nodes, edges };

    const options = {
      layout: {
          hierarchical: true
      },
      edges: {
          color: "#000000",
          smooth: {
          type: "continuous",
          forceDirection: "none"
        }
      },
      width: '1000px',
      autoResize: true
    };


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
            <div className="node__graph">
              <Graph graph={graph} options={options} />
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
    // actions: bindActionCreators(ipfsActions, dispatch)
  };
}

Node.contextTypes = {
  ipfs: PropTypes.object
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Node);

import React from 'react';
import PropTypes from 'prop-types';
import { Link, IndexLink } from 'react-router';

// This is a class-based component because the current
// version of hot reloading won't hot reload a stateless
// component at the top-level.
class App extends React.Component {
  // <IndexLink className="sidebar__item">Home</IndexLink>
  render() {
    return (
      <div className="wrapper">
        <aside className="sidebar">
          <h2 className="sidebar__heading">IPFS-AST</h2>
          <Link to="nodes" className="sidebar__item">Nodes</Link>
          <Link to="/" className="sidebar__item">Upload</Link>
        </aside>
        <main>
          {this.props.children}
        </main>
      </div>
    );
  }
}

App.propTypes = {
  children: PropTypes.element
};

export default App;

import React from 'react';
import { browserHistory } from 'react-router';

class NodeSearch extends React.Component {
  constructor(props) {
    super(props);

    this.state = { value: '' };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange(event) {
    this.setState({ value: event.target.value });
  }

  handleSubmit() {
    const { value } = this.state;
    browserHistory.push('/nodes/' + value);
  }

  render() {
    return (
      <div className="node-search">
        <h2>Search Node by Hash</h2>
        <input type="text" onChange={this.handleChange} />
        <button onClick={this.handleSubmit}>Search</button>
      </div>
    );
  }
}

export default NodeSearch;

import React from 'react';
import { browserHistory } from 'react-router';

import AceEditor from 'react-ace';
import brace from 'brace';

import 'brace/mode/javascript';
import 'brace/theme/monokai';

import { storeCode } from '../../../ipfs-ast/main';

class Upload extends React.Component {
  constructor(props) {
    super(props);
    this.state = { value: '' };
    this.handleFileUpload = this.handleFileUpload.bind(this);
    this.handleEditorChange = this.handleEditorChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleFileUpload(event) {
    const reader = new FileReader();
    const file = event.target.files[0];
    
    reader.onload = (upload) => {
      this.setState({
        value: upload.target.result,
      });
    };

    reader.readAsText(file);
  }

  handleEditorChange(newValue) {
    this.setState({ value: newValue });
  }

  handleSubmit() {
    const { value } = this.state;

    storeCode(value).then(node => {
      const hash = node.Hash;
      browserHistory.push('/nodes/' + hash);
    });

    // TODO: Error handling
  }

  render() {
    const { value } = this.state;

    return (
      <div>
        <h3>File Upload</h3>
        <input type="file" onChange={this.handleFileUpload} />

        <h3>Editor</h3>
        <AceEditor
          mode="javascript"
          theme="monokai"
          name="editor"
          value={value}
          onChange={this.handleEditorChange}
        />

        <button onClick={this.handleSubmit}>Upload</button>
      </div>
    );
  }
}

export default Upload;

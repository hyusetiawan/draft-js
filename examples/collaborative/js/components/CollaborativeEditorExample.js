'use strict';
import React from 'react';
import ReactDOM from 'react-dom';
import Draft from 'draft-js'
import Immutable from 'immutable'
import deepdiff from 'deep-diff';
import diff from '../diff'
const doc = Url.queryString('doc');
const user = Url.queryString('user');
const socket = io.connect({
  transports: ['websocket'],
  upgrade: false,
  query: {user, doc},
});



const {
  Editor,
  EditorState,
  ContentState,
  ContentBlock,
  convertToRaw,
  convertFromRaw,
  RichUtils,
} = Draft;

window.ContentState = ContentState;
window.EditorState = EditorState;
window.ContentBlock = ContentBlock;
window.Immutable = Immutable;
window.convertToRaw = convertToRaw;
window.convertFromRaw = convertFromRaw
window.diff = diff
const BLOCK_TYPES = [
  {label: 'H1', style: 'header-one'},
  {label: 'H2', style: 'header-two'},
  {label: 'H3', style: 'header-three'},
  {label: 'H4', style: 'header-four'},
  {label: 'H5', style: 'header-five'},
  {label: 'H6', style: 'header-six'},
  {label: 'Blockquote', style: 'blockquote'},
  {label: 'UL', style: 'unordered-list-item'},
  {label: 'OL', style: 'ordered-list-item'},
  {label: 'Code Block', style: 'code-block'},
];

const INLINE_STYLES = [
  {label: 'Bold', style: 'BOLD'},
  {label: 'Italic', style: 'ITALIC'},
  {label: 'Underline', style: 'UNDERLINE'},
  {label: 'Monospace', style: 'CODE'},
];

class StyleButton extends React.Component {
  constructor() {
    super();
    this.onToggle = (e) => {
      e.preventDefault();
      this.props.onToggle(this.props.style);
    };
  }

  render() {
    let className = 'RichEditor-styleButton';
    if (this.props.active) {
      className += ' RichEditor-activeButton';
    }
    return (
      <span className={className} onMouseDown={this.onToggle}>
        {this.props.label}
      </span>
    );
  }
}

const BlockStyleControls = (props) => {
  const {editorState} = props;
  const selection = editorState.getSelection();
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType();

  return (
    <div className="RichEditor-controls">
      {BLOCK_TYPES.map((type) =>
        <StyleButton
          key={type.label}
          active={type.style === blockType}
          label={type.label}
          onToggle={props.onToggle}
          style={type.style}
        />
      )}
    </div>
  );
};


const InlineStyleControls = (props) => {
  var currentStyle = props.editorState.getCurrentInlineStyle();
  return (
    <div className="RichEditor-controls">
      {INLINE_STYLES.map(type =>
        <StyleButton
          key={type.label}
          active={currentStyle.has(type.style)}
          label={type.label}
          onToggle={props.onToggle}
          style={type.style}
        />
      )}
    </div>
  );
};


export default class CollaborativeEditorExample extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      editorState: EditorState.createEmpty(),
      connected: false,
      doc,
      user,
    };
    this.socket = socket;
    socket.on('connect', () => {
      this.setState({connected: true});
      console.log('Connected');
    });
    socket.on('sync', (data) => {
      this.setContentFromRaw(data.contentState);
    });


  }
  setContentFromRaw = (contentState) => {
    const currEditorState = this.state.editorState;
    const currSelState = currEditorState.getSelection()
    const newContentState = convertFromRaw(contentState);
    const newContentEditorState = EditorState.createWithContent(newContentState);
    const newcurrSelState.getHasFocus()
      ? EditorState.forceSelection(
          newContentEditorState,
          currSelState,
        )
      : EditorState.createWithContent(newContentState)
    this.setState({editorState: newEditorState})
  }

  focus = () => {
    this.refs.editor.focus();
  }

  onChange = (newEditorState) => {
    const currEditorState = this.state.editorState;
    const newContentState = newEditorState.getCurrentContent();
    const currContentState = currEditorState.getCurrentContent();
    const currSelState = currEditorState.getSelection().toJS();
    const newSelState = newEditorState.getSelection().toJS();

    const newRawContentState = convertToRaw(newContentState);
    const currRawContentState = convertToRaw(currContentState);

    const diffContentState = diff.diff(currRawContentState, newRawContentState);
    const diffSelState = diff.diff(currSelState, newSelState);

    if (diffContentState)
      this.socket.emit('diff', {diffs: diffContentState})
    this.setState({editorState: newEditorState});
  }

  componentDidMount() {
    // for testing purposes
    // window.setState = (editorState) => this.setState({editorState})
    // window.state = () => this.state.editorState
    // window.contentState = () => this.state.editorState.getCurrentContent()
    // window.blockArray = () => this.state.editorState.getCurrentContent().getBlocksAsArray()
  }

  logState = () => {
    console.log(this.state.editorState.toJS());
  }
  _toggleBlockType = (blockType) => {
    this.onChange(
      RichUtils.toggleBlockType(
        this.state.editorState,
        blockType
      )
    );
  }

  _toggleInlineStyle = (inlineStyle) => {
    this.onChange(
      RichUtils.toggleInlineStyle(
        this.state.editorState,
        inlineStyle
      )
    );
  }

  render() {
    const {
      editorState,
      connected,
    } = this.state;

    const editor = (connected) ? (

        <div style={styles.root}>
          <div style={styles.editor} onClick={this.focus}>
            <BlockStyleControls
              editorState={editorState}
              onToggle={this._toggleBlockType}
            />
            <InlineStyleControls
              editorState={editorState}
              onToggle={this._toggleInlineStyle}
            />
            <Editor
              editorState={this.state.editorState}
              onChange={this.onChange}
              placeholder="Enter some text..."
              ref="editor"
            />
          </div>
          <input
            onClick={this.logState}
            style={styles.button}
            type="button"
            value="Log State"
          />
        </div>
    ) : null;
    return editor;
  }
}

const styles = {
  root: {
    fontFamily: '\'Helvetica\', sans-serif',
    padding: 20,
    width: 600,
  },
  editor: {
    border: '1px solid #ccc',
    cursor: 'text',
    minHeight: 80,
    padding: 10,
  },
  button: {
    marginTop: 10,
    textAlign: 'center',
  },
};

/**
 * Copyright (c) 2013-present, Facebook, Inc. All rights reserved.
 *
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only. Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const APP_PORT = 3000;
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const deepdiff = require('deep-diff');
const diff = require('./js/diff');
const Draft = require('draft-js');
const {
  EditorState,
  convertToRaw,
} = Draft;

const states = {};

app.use(express.static('public'));
app.use(express.static('node_modules'));

app.get('/', function(req, res){
  res.sendFile('public/index.html');
});

io.on('connection', function(socket){
  const {
    user,
    doc,
  } = socket.handshake.query;

  // initialize state of client
  if (!states[doc]) {
    const emptyContent = EditorState.createEmpty().getCurrentContent();
    states[doc] = convertToRaw(emptyContent);
  }
  socket.emit('sync', {contentState: states[doc]});
  // end initialize

  socket.on('diff', (data) => {
    const {
      diffs,
      contentState,
    } = data;
    if (!diffs) {
      return;
    }
    diff.patch(states[doc], diffs)
    socket.broadcast.emit('sync', {contentState: states[doc]});
  });
  console.log(`${user} is connected to ${doc}`);
});

server.listen(APP_PORT, function(){
  console.log('listening on *:' + APP_PORT);
});

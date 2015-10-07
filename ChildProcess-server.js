var cp = require('child_process');
var WebSocket = require('ws');

var port = 0xC1e;
var ws;

var children = {};

var wss = new WebSocket.Server({
  port: port
});

var sendEvent = function (event) {
  var message = JSON.stringify(event);
  console.log('ws -> send: ' + message);
  ws.send(message);
};

var onMessage = function (message) {
  console.log('ws -> message: ' + message);
  var messageObj = JSON.parse(message);
  var action = messageObj.action;
  var uuid = messageObj.uuid;

  var name = messageObj.name;
  var args = messageObj.args;
  var options = messageObj.options;

  var data = messageObj.data;
  var signal = messageObj.signal;

  if (action === 'spawn') {
    _spawn(uuid, name, args, options);
  }else if(action === 'exec'){
    _exec(uuid, name, options);
  }else if(action === 'stdin.write') {
    children[uuid].stdin.write(data);
  }else if(action === 'stdin.end') {
    children[uuid].stdin.end();
  }else if(action === 'kill'){
    children[uuid].kill(signal);
  }

}

wss.on('connection', function (ws_) {
  console.log('ws -> connection');
  ws = ws_;
  ws.on('message', onMessage);

  ws.on('close', function () {
    console.log('ws -> close');
  });
});

var _spawn = function (uuid, name, args, options) {

  var child = cp.spawn(name, args, options);
  children[uuid] = child;

  child.stdout.on('data', function (data) {
    sendEvent({
      type: 'stdout.data', data: data, typeOf: typeof data, uuid: uuid
    });
  });

  child.stderr.on('data', function (data) {
    sendEvent({
      type: 'stderr.data', data: data, uuid: uuid
    });
  });

  child.on('exit', function (code, signal) {
    sendEvent({
      type: 'exit', code: code, signal: signal, uuid: uuid
    });
  });

  child.on('close', function (code, signal) {
    sendEvent({
      type: 'close', code: code, signal: signal, uuid: uuid
    });
  });

  sendEvent({
    type: 'open', uuid: uuid
  });

}

var _exec = function (uuid, name, options) {
  var child = cp.exec(name, options, function(error, stdout, stderr){
    sendEvent({
      type: 'exec',
      error: error ? error.message : null,
      stdout: stdout,
      stderr: stderr,
      uuid: uuid
    });
  });

  children[uuid] = child;

  child.stdout.on('data', function (data) {
    sendEvent({
      type: 'stdout.data', data: data, typeOf: typeof data, uuid: uuid
    });
  });

  child.stderr.on('data', function (data) {
    sendEvent({
      type: 'stderr.data', data: data, uuid: uuid
    });
  });

  child.on('exit', function (code, signal) {
    sendEvent({
      type: 'exit', code: code, signal: signal, uuid: uuid
    });
  });

  child.on('close', function (code, signal) {
    sendEvent({
      type: 'close', code: code, signal: signal, uuid: uuid
    });
  });

  sendEvent({
    type: 'open', uuid: uuid
  });

};

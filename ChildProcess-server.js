var cp = require('child_process');
var WebSocket = require('ws');

var port = 0xC1e;
var ws;

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

  var name = messageObj.name;
  var args = messageObj.args;
  var options = messageObj.options;

  if (action === 'spawn') {
    _spawn(name, args, options);
  }else if(action === 'exec'){
    _exec(name, options)
  }
};

wss.on('connection', function (ws_) {
  console.log('ws -> connection');
  ws = ws_;
  ws.on('message', onMessage);

  ws.on('close', function () {
    console.log('ws -> close');
  });
});

var _spawn = function (name, args, options) {
  var command = cp.spawn(name, args, options);

  command.stdout.on('data', function (data) {
    sendEvent({
      type: 'stdout.data', data: data, typeOf: typeof data
    });
  });

  command.stderr.on('data', function (data) {
    sendEvent({
      type: 'stderr.data', data: data
    });
  });

  command.on('exit', function (code, signal) {
    sendEvent({
      type: 'exit', code: code, signal: signal
    });
  });

  command.on('close', function (code, signal) {
    sendEvent({
      type: 'close', code: code, signal: signal
    });
  });

};

var _exec = function (name, options) {
  var command = cp.exec(name, options, function(error, stdout, stderr){
    sendEvent({
      type: 'exec',
      error: error ? error.message : null,
      stdout,
      stderr
    });
  });

  command.stdout.on('data', function (data) {
    sendEvent({
      type: 'stdout.data', data: data, typeOf: typeof data
    });
  });

  command.stderr.on('data', function (data) {
    sendEvent({
      type: 'stderr.data', data: data
    });
  });

  command.on('exit', function (code, signal) {
    sendEvent({
      type: 'exit', code: code, signal: signal
    });
  });

  command.on('close', function (code, signal) {
    sendEvent({
      type: 'close', code: code, signal: signal
    });
  });

};

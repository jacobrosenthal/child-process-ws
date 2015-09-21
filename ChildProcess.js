var events = require('events');
var util = require('util');

var WebSocket = require('ws');

function Bridge () {
  var port = 0xC1e;
  var ip = process.env.IP || 'localhost';

  this.open = false;
  this.command = null;
  this._ws = new WebSocket('ws://' + ip + ':' + port);

  this.on('message', this._onMessage.bind(this));

  if (!this._ws.on) {
    this._ws.on = this._ws.addEventListener;
  }

  this._ws.on('open', this._onOpen.bind(this));
  this._ws.on('close', this._onClose.bind(this));
  this._ws.on('error', this._onError.bind(this));

  var _this = this;
  this._ws.on('message', function (event) {
    var data = (process.title === 'browser') ? event.data : event;

    _this.emit('message', JSON.parse(data));
  });
}
util.inherits(Bridge, events.EventEmitter);

Bridge.prototype._onOpen = function () {
  this.open = true;
  this.emit('open');
};

Bridge.prototype._onClose = function () {
  this.open = false;
  this.emit('close');
};

Bridge.prototype._onError = function (error) {
  this.emit('xpcError', error);
};

Bridge.prototype._onMessage = function (event) {
  var type = event.type;
  var data = event.data ? new Buffer(event.data, 'hex') : null;
  var code = event.code;
  var signal = event.signal;

  // console.log('on -> message: ' + JSON.stringify(event, undefined, 2));

  if (type === 'stdout.data') {
    this.command.stdout.emit('data', data);
  } else if (type === 'stderr.data') {
    this.command.stderr.emit('data', data);
  }else if (type === 'exit') {
    this.command.emit('exit', code, signal);
  }else if (type === 'close') {
    this.command.emit('close', code, signal);
  }

};

Bridge.prototype._sendCommand = function (command) {
  // console.log('on -> sendMessage: ' + JSON.stringify(command, undefined, 2));
  var message = JSON.stringify(command);
  this._ws.send(message);
};

var bridge = new Bridge();

function Stdout () {
};
util.inherits(Stdout, events.EventEmitter);

function Stderr () {
};
util.inherits(Stderr, events.EventEmitter);

function  Command () {
  this.stdout = new Stdout();
  this.stderr = new Stderr();
};
util.inherits(Command, events.EventEmitter);

var ChildProcess = function ChildProcess () {
};
util.inherits(ChildProcess, events.EventEmitter);

var spawn = function (name, args, options) {
  var command = new Command();

  var _spawn = function () {
    bridge._sendCommand({
      action: 'spawn', name, args, options
    });
  };

  bridge.command = command;
  if(!bridge.open) {
    bridge.once('open', function () {
      _spawn();
    });
  }else {
    _spawn();
  }

  return command;
};

module.exports = {
  ChildProcess, spawn
};

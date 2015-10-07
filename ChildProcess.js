var events = require('events');
var util = require('util');

var WebSocket = require('ws');
var uuidgen = require('uuid');

function Bridge () {
  var port = 0xC1e;
  var ip = process.env.IP || 'localhost';

  this.open = false;
  this.children = {};
  this.callback = null;
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
  var data = event.data;
  var code = event.code;
  var signal = event.signal;
  var typeOf = event.typeOf;

  var error = event.error ? new Error(event.error) : null;
  var stdout = event.stdout;
  var stderr = event.stderr;

  var uuid = event.uuid;

  var child = this.children[uuid];
  // console.log('on -> message: ' + JSON.stringify(event, undefined, 2));

  if (type === 'stdout.data') {
    // exec appears to emit strings, while spawn emits buffers?
    if(typeOf === 'string'){
      child.stdout.emit('data', data);
    }else if(typeOf === 'object'){
      child.stdout.emit('data', new Buffer(data, 'hex'));
    }
  } else if (type === 'stderr.data') {
    child.stderr.emit('data', data);
  }else if (type === 'exit') {
    child.emit('exit', code, signal);
  }else if (type === 'close') {
    child.emit('close', code, signal);
  }else if (type === 'exec') {
    this.callback(error, stdout, stderr);
  }else if (type === 'open') {
    child.stdin.emit('open');
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

function Stdin (uuid) {
  this.open = false;
  this.uuid = uuid;
};
util.inherits(Stdin, events.EventEmitter);

Stdin.prototype.write = function(data){
  var self = this;

  var _write = function () {
    console.log('push', self.uuid)
    bridge._sendCommand({
      action: 'stdin.write', uuid: self.uuid, data: data
    });
  };

  if(!this.open) {
    this.once('open', function () {
      console.log('child.open');
      _write();
    });
  }else {
    _write();
  }
}

Stdin.prototype.end = function(){
  console.log('end', this.uuid);

  bridge._sendCommand({
    action: 'stdin.end', uuid: this.uuid
  });
}

function Child (uuid) {
  this.pid = null;
  this.connected = false;
  this.stdout = new Stdout();
  this.stderr = new Stderr();
  this.stdin = new Stdin(uuid);
};
util.inherits(Child, events.EventEmitter);

Child.prototype.kill = function(signal){
  console.log('kill', this.uuid);

  bridge._sendCommand({
    action: 'kill', uuid: this.uuid, signal: signal
  });
}

var ChildProcess = function ChildProcess () {
};
util.inherits(ChildProcess, events.EventEmitter);

var spawn = function (name, args, options) {
  var uuid = uuidgen.v4();
  var child = new Child(uuid);
  bridge.children[uuid] = child;

  var _spawn = function () {
    bridge._sendCommand({
      action: 'spawn', uuid: uuid, name: name, args: args, options: options
    });
  };

  if(!bridge.open) {
    bridge.once('open', function () {
      _spawn();
    });
  }else {
    _spawn();
  }

  return child;
};

var exec = function (name, options, callback) {
  if(typeof callback === 'undefined'){
    var callback = options;
  }

  var uuid = uuidgen.v4();
  var child = new Child(uuid);
  bridge.children[uuid] = child;

  var _exec = function () {
    bridge.callback = callback;
    bridge._sendCommand({
      action: 'exec', uuid: uuid, name: name, options: options
    });
  };

  if(!bridge.open) {
    bridge.once('open', function () {
      _exec();
    });
  }else {
    _exec();
  }

  return child;
};

module.exports = {
  ChildProcess: ChildProcess,
  spawn: spawn,
  exec: exec
};

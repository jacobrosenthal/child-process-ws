var spawn = require('../').spawn;
// var spawn = require('child_process').spawn;

var command = spawn('./test.sh', [], {});

command.stdout.on('data', function (data) {
  console.log('stdout', data.toString());
});

command.stderr.on('data', function (data) {
  console.log('stderr', data);
});

command.on('exit', function (code, signal) {
  console.log('exit', code, signal);
});

command.on('close', function (code, signal) {
  console.log('close', code, signal);
});

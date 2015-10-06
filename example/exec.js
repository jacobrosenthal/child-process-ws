var exec  = require('../').exec;
// var exec  = require('child_process').exec;

var command = exec('./test.sh', [], function(error, stdout, stderror){
  console.log(error, stdout.toString(), stderror.toString());
});

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

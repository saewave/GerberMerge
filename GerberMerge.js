let fs = require('fs')
let gerberParser = require('gerber-parser')
let commandLineArgs = require('command-line-args')
let getUsage = require('command-line-usage')

var baseDir = __dirname + '/gerber_files/';

const optionDefinitions = [
    { name: 'verbose', alias: 'v', type: Boolean },
    { name: 'in', type: String, multiple: true },
    { name: 'dir', type: String },
];

const options = commandLineArgs(optionDefinitions)
if (options.dir) {
    baseDir = options.dir;
}

console.log(options);

var parser = gerberParser()
parser.on('warning', function(w) {
  console.warn('warning at line ' + w.line + ': ' + w.message)
})

fs.createReadStream(baseDir + '/gerber_files/Hub USB 2.0/Hub USB 2.0.GBL')
  .pipe(parser)
  .on('data', function(obj) {
    //console.log(JSON.stringify(obj))
  })
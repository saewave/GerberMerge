const fs = require('fs');
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const path = require('path');
const colors = require('colors');
const Merger = require('./lib/merger').Merger;

const merger = new Merger();

var baseDir = '';

const optionDefinitions = [
    { name: 'verbose', alias: 'v', type: Boolean },
    { name: 'in', type: String, multiple: true },
    { name: 'dir', type: String, defaultValue: __dirname + '/gerber_files/' },
    { name: 'clone', alias: 'c', type: Number, defaultValue: 1 },
    { name: 'dx', type: Number, defaultValue: 0 },
    { name: 'dy', type: Number, defaultValue: 0 },
    { name: 'units', alias: 'u', type: String, defaultValue: 'in' },
    { name: 'postfix', alias: 'p', type: String, defaultValue: '_merged' },
    { name: 'skip-ext-check', type: Boolean, defaultValue: false },
    { name: 'zero', type: Number, defaultValue: 'L' },
    { name: 'places', type: String, defaultValue: '2,5' }
];

const allowedExts = ['.gbl', '.gbo', '.gbs', '.gml', '.gtl', '.gto', '.gtp', '.txt'];
const options = commandLineArgs(optionDefinitions)
if (options.dir) {
    baseDir = options.dir;
}

if (options.in == undefined) {
    console.error('Argument --in is not set!');
    process.exit(1);
}

var aPlaces = options.places.split(',');
if (aPlaces.length == 1) {
    options.places = [parseInt(aPlaces[0]), 5];
} else if (aPlaces.length == 2) {
    if (aPlaces[0] == '') {
        options.places = [2, parseInt(aPlaces[1])];
    } else {
        options.places = [parseInt(aPlaces[0]), parseInt(aPlaces[1])];
    }
} 

console.log("\nGerberMerge options:".yellow);
console.log('    Base dir:         ', baseDir);
console.log('    Clone:            ', options.clone);
console.log('    dX:               ', options.dx);
console.log('    dY:               ', options.dy);
console.log('    Units:            ', options.units);
console.log('    Skip ext check:   ', options['skip-ext-check']);
console.log('    Input files/dirs:');
for (i in options.in) {
    console.log('        "' + options.in[i] + '"');
}
console.log("\n");

for (var _in in options.in) {
    var __in = options.in[_in];
    if (fs.lstatSync(baseDir + '/' + __in).isDirectory()) {        //Process it as dir
        console.log(('Batch process of: "' + __in + '" dir').yellow);
        fs.readdir(baseDir + '/' + __in, function (err, files) {
            if (!err) {
                
                for (f in files) {
                    if (!options["skip-ext-check"] && !allowedExts.includes(path.extname(files[f]).toLowerCase())) continue;
                    console.log(('Process file: "' + options.in[0] + '/' + files[f] + '"').yellow);
                    try {
                        if (options.in.length == 1 && options.clone > 0) {
                            const content = fs.readFileSync(baseDir + '/' + options.in[0] + '/' + files[f]);
                            const result = merger.mergeFiles(content.toString(), options);
                            fs.writeFileSync(baseDir + '/' + options.in[0] + '/' + files[f] + options.postfix, result);
                        }
                    } catch (e) {
                        console.log('    ', e.toString().red);
                    }
                }
            } else {
                console.error(err);
            }
        });
    } else {        //process it as file
        console.log(('Process single file: "' + __in + '"').yellow);
        if (options.in.length == 1 && options.clone > 0) {
            const content = fs.readFileSync(baseDir + '/' + __in);
            const result = merger.mergeFiles(content.toString(), options);
            fs.writeFileSync(baseDir + '/' + __in + options.postfix, result);
        }
    }
}

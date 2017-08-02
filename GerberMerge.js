const fs = require('fs');
const commandLineArgs = require('command-line-args');
const getUsage = require('command-line-usage');
const path = require('path');
const colors = require('colors');
const ini = require('node-ini');
const Merger = require('./lib/merger').Merger;

const merger = new Merger();

var baseDir = '';

const optionDefinitions = [
    { name: 'verbose', alias: 'v', type: Boolean },
    { name: 'in', type: String, multiple: true },
    { name: 'dir', type: String, defaultValue: __dirname + '/gerber_files/' },
    { name: 'clone', alias: 'c', type: Number, defaultValue: 0, multiple: true },
    { name: 'dx', type: Number, defaultValue: 0, multiple: true },
    { name: 'dy', type: Number, defaultValue: 0, multiple: true },
    { name: 'sx', type: Number, defaultValue: 0, multiple: true },
    { name: 'sy', type: Number, defaultValue: 0, multiple: true },
    { name: 'units', alias: 'u', type: String, defaultValue: 'in' },
    { name: 'postfix', alias: 'p', type: String, defaultValue: '_merged' },
    { name: 'prefix', type: String, defaultValue: 'Merged' },
    { name: 'skip-ext-check', type: Boolean, defaultValue: false },
    { name: 'zero', type: String },
    { name: 'places', type: String },
    { name: 'init-coords', type: Boolean, defaultValue: false },
    { name: 'ini-section', type: String },
    { name: 'merge', alias: 'm', type: Boolean, defaultValue: false}
];

let allowedExts = ['.gbl', '.gbo', '.gbs', '.gml', '.gtl', '.gts', '.gto', '.gtp', '.txt'];

const options = commandLineArgs(optionDefinitions)

var cfg = ini.parseSync('./GerberMerge.ini');

var iniSection = {};
if (options['ini-section'] != undefined && cfg[options['ini-section']] != undefined) {
    iniSection = cfg[options['ini-section']];
    if (iniSection['allowed-exts'] != undefined) {
        allowedExts = iniSection['allowed-exts'].split(',');
    }
}

if (options.dir) {
    baseDir = options.dir;
}

if (options.in == undefined) {
    console.error('Argument --in is not set!');
    process.exit(1);
}

var aPlaces = [];
if (options.places != undefined) {
    aPlaces = options.places.split(',');
    if (aPlaces.length == 1) {
        options.places = [parseInt(aPlaces[0]), 5];
    } else if (aPlaces.length == 2) {
        if (aPlaces[0] == '') {
            options.places = [2, parseInt(aPlaces[1])];
        } else {
            options.places = [parseInt(aPlaces[0]), parseInt(aPlaces[1])];
        }
    }
}

console.log("\nGerberMerge options:".yellow);
console.log('    Base dir:         ', baseDir);
console.log('    Clone:            ', options.clone);
console.log('    Merge:            ', options.merge);
console.log('    dX:               ', options.dx);
console.log('    dY:               ', options.dy);
console.log('    sX:               ', options.sx);
console.log('    sY:               ', options.sy);
console.log('    Units:            ', options.units);
console.log('    Skip ext check:   ', options['skip-ext-check']);
console.log('    Places:           ', options['places'] ? options['places'].join(',') : 'n/s');
console.log('    Init coordinates: ', options['init-coords']);
console.log('    Input files/dirs:');
for (var i in options.in) {
    console.log('        "' + options.in[i] + '"');
}
console.log("\n");

var mergeFiles = [];
let batchMergeFiles = {};

for (var _in in options.in) {
    let __in = options.in[_in];
    if (fs.lstatSync(baseDir + '/' + __in).isDirectory()) {        //Process it as dir
        console.log(('Batch process of: "' + __in + '" dir').yellow);
        let files = fs.readdirSync(baseDir + '/' + __in);
        for (var f in files) {
            var ext = path.extname(files[f]).toLowerCase();
            if (!options["skip-ext-check"] && !allowedExts.includes(ext)) continue;
            if (options.merge) {
                if (batchMergeFiles[ext] == undefined) {
                    batchMergeFiles[ext] = [];
                }
                batchMergeFiles[ext].push(__in + '/' + files[f]);
            } else {
                console.log(('Process file: "' + options.in[0] + '/' + files[f] + '"').yellow);
                try {
                    const content = fs.readFileSync(baseDir + '/' + options.in[0] + '/' + files[f]);
                    const result = merger.mergeFiles([content.toString()], options);
                    fs.writeFileSync(baseDir + '/' + options.in[0] + '/' + files[f] + options.postfix, result);
                } catch (e) {
                    console.log('    ', e.toString().red);
                }
            }
        }
    } else {        //process it as file
        const content = fs.readFileSync(baseDir + '/' + __in);
        if (options.merge) {
            mergeFiles.push(content.toString());
        } else {
           console.log(('Process single file: "' + __in + '"').yellow);
           const result = merger.mergeFiles([content.toString()], options);
           console.log('Write to: ' + baseDir + '/' + __in + options.postfix);
           fs.writeFileSync(baseDir + '/' + __in + options.postfix, result);
        }
    }
}

if (options.merge) {
    if (mergeFiles.length) {
        const result = merger.mergeFiles(mergeFiles, options);
        fs.writeFileSync(baseDir + '/' + __in + options.postfix, result);
        console.log('Write to: ' + baseDir + '/' + __in + options.postfix);
    }
    if (batchMergeFiles) {
        for (var fidx in batchMergeFiles) {
            var toMerge = [];
            for (var cidx in batchMergeFiles[fidx]) {
                toMerge.push(fs.readFileSync(baseDir + '/' + batchMergeFiles[fidx][cidx]).toString());
            }
            const result = merger.mergeFiles(toMerge, options);
            fs.writeFileSync(baseDir + '/' + options.prefix + fidx, result);
            console.log('Write to: ' + baseDir + '/' + options.prefix + fidx);
        }
    }
}

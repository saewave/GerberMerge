const gerberParser = require('gerber-parser');
var numeral = require('numeral');

class Merger {
    
    mergeFiles (input, options) {

        var parser = gerberParser({'zero' : options.zero, places: options.places});

        if (Array.isArray(input)) {
            //nothing here
        } else {
            const parsedFile = parser.parseSync(input);
            var fileText = input.split("\n");
            var fileCurLine = 0;
            var outFileText = [];
            var fileUnits = '';
            var headerEnded = false;
            var lineUpdated = false;
            var DBlockStarted = 0;
            var DBlock = [];
            var DBlockText = [];
            var ops = {};

            for (var i in parsedFile) {
                if (parser.format.filetype == 'drill')      //fix bug in parse-gerber with lines numbers
                    parsedFile[i].line--;
                lineUpdated = false;
                if (!headerEnded && !fileUnits && parsedFile[i].type == 'set' && parsedFile[i].prop == 'units') {
                    fileUnits = parsedFile[i].value;
                }
                

                if (parsedFile[i].type == 'set' && parsedFile[i].prop == 'tool' && DBlock.length == 0 && !DBlockStarted) {
                    DBlockStarted = parsedFile[i].value;
                    DBlockText.length = 0;
                }

                if (parsedFile[i].type == 'op' && DBlockStarted) {
                    DBlock.push(parsedFile[i]);
                }

                if ( fileCurLine < parsedFile[i].line ) {
                    for (var l = fileCurLine; l < parsedFile[i].line; l++) {
                        if (!headerEnded) {
                            outFileText[l] = fileText[l];
                        } else {
                            outFileText.push(fileText[l]);
                        }

                    }
                } else {
                    if (!headerEnded) {
                        outFileText[parsedFile[i].line] = fileText[parsedFile[i].line];
                    } else {
                        outFileText.push(fileText[parsedFile[i].line]);
                    }
                }

                if (parsedFile[i].type == 'set' && parsedFile[i].prop == 'tool' && DBlock.length > 0 && DBlockStarted) {
                    DBlockStarted = parsedFile[i].value;
                    DBlockText = this.formatCoordRow(DBlock, options, parser.format);
                    outFileText = outFileText.concat(DBlockText);
                    DBlockText.length = 0;
                    DBlock.length = 0;
                }

                if (parsedFile[i].type == 'tool' && !headerEnded) {     //assume that header is ended
                    headerEnded = true;
                    if (!fileUnits) {
                        console.warn(('Units definition not found, "' + options.units + '" will be used as default').red);
                    }

                    console.log('    Settings for file:');
                    console.log('        Units:            ', fileUnits);
                    console.log('        Type:             ', parser.format.filetype);
                    if (options.units != fileUnits) {
                        console.log(('            WARNING: CLI units doen\'t equal to units from file! Please use units as in file.').cyan);
                        process.exit(1);
                    }
                }

                if (parsedFile[i].type == 'done') {
                    DBlockText = this.formatCoordRow(DBlock, options, parser.format);
                    outFileText = outFileText.concat(DBlockText);
                    if (parser.format.filetype == 'gerber')
                        outFileText = outFileText.concat('M02*')
                    else
                        outFileText = outFileText.concat('M30')
                    DBlockText.length = 0;
                    DBlock.length = 0;
                }

                fileCurLine = parsedFile[i].line;
            }
        }
        return outFileText.join("\n");
    }

    formatCoordRow (DBlock, options, format) {
        var DBlockText = [];
        for (var c = 0; c < options.clone; c++) {
            for (var b in DBlock) {

                var dt = '';
                var strEnd = '';
                if (format.filetype == 'gerber') {
                    strEnd = '*';
                    switch (DBlock[b].op) {
                        case 'int': 
                            dt = 'D01';
                            break;
                        case 'move': 
                            dt = 'D02';
                            break;
                        case 'flash': 
                            dt = 'D03';
                            break;
                    }
                }
                DBlock[b].coord.x += options.dx;
                DBlock[b].coord.y += options.dy;
                var xd = DBlock[b].coord.x.toFixed(options.places[1]).split('.');
                var yd = DBlock[b].coord.y.toFixed(options.places[1]).split('.');
                const numFormat = '0'.repeat(options.places[0]) + '.' + '0'.repeat(options.places[1]);
                var xds = numeral(DBlock[b].coord.x).format(numFormat).replace('.', '');
                var yds = numeral(DBlock[b].coord.y).format(numFormat).replace('.', '');

                if (format.zero == 'L' && format.filetype == 'drill') {
                    xds = xds.replace(/^0+/, '');
                    yds = yds.replace(/^0+/, '');
                }
                var str = 'X' + xds + 'Y' + yds + dt + strEnd; 

                DBlockText.push(str);
            }
        }
        return DBlockText;
    }
}

module.exports = {Merger};
const gerberParser = require('gerber-parser');


class Merger {
    
    mergeFiles (input, options) {
        var parser = gerberParser();

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
//                console.log('Process line: ', JSON.stringify(parsedFile[i]), DBlock.length);
                lineUpdated = false;
                if (!headerEnded && !fileUnits && parsedFile[i].type == 'set' && parsedFile[i].prop == 'units') {
                    fileUnits = parsedFile[i].value;
                }
                

                if (parsedFile[i].type == 'set' && parsedFile[i].prop == 'tool' && DBlock.length == 0 && !DBlockStarted) {
//                    console.log('D Block Started at line ', parsedFile[i].line, '! Name: ', DBlockStarted);
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
                    //console.log(parsedFile[i]);
                    DBlockStarted = parsedFile[i].value;
                    //console.log(DBlock);
                    DBlockText = this.formatCoordRow(DBlock, options);
                    outFileText = outFileText.concat(DBlockText);
                    //console.log('DBlockText.length:', DBlockText.length);
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
                    if (options.units != fileUnits) {
                        console.log(('            WARNING: CLI units doen\'t equal to units from file! Please use units as in file.').cyan);
                        process.exit(1);
                    }
                }

                if (parsedFile[i].type == 'done') {
                    //console.log('Done!', DBlockText.length);
                    DBlockText = this.formatCoordRow(DBlock, options);
                    outFileText = outFileText.concat(DBlockText);
                    outFileText = outFileText.concat('M02*');
                    DBlockText.length = 0;
                    DBlock.length = 0;
                }

                fileCurLine = parsedFile[i].line;
            }
        }
        return outFileText.join("\n");
    }

    formatCoordRow (DBlock, options) {
        var DBlockText = [];
        for (var c = 0; c < options.clone; c++) {
            for (var b in DBlock) {

                var dt = '';
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
                DBlock[b].coord.x += options.dx;
                DBlock[b].coord.y += options.dy;
                var xd = DBlock[b].coord.x.toFixed(5).split('.');
                var yd = DBlock[b].coord.y.toFixed(5).split('.');

                var str = 'X' + (DBlock[b].coord.x < 10 ? '0' : '') + Math.trunc(DBlock[b].coord.x) + xd[1] + 'Y' + (DBlock[b].coord.y < 10 ? '0' : '') + Math.trunc(DBlock[b].coord.y) + yd[1] + dt + '*';
                DBlockText.push(str);
            }
        }
        return DBlockText;
    }
}

module.exports = {Merger};
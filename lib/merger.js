const gerberParser = require('gerber-parser');
var numeral = require('numeral');
var lastXCoord = 0;
var lastYCoord = 0;

class Merger {
    
    mergeFiles (files, allOptions) {
        var mapDBlock = [];
        var DBlockMaxValue = 0;
        var headerDBlockText = [];
        var mapAMBlock = [];
        var AMBlockMaxValue = 0;
        var headerAMBlock = [];
        var AMBlockText = [];
        var DBlock = {};
        var outFileText = [];
        var options = {};
        var doneDir = '';

        for (var indf in files) 
        {
            options = this.cloneOptions(allOptions, indf);
            var _options = {};
            if (options.zero != undefined)
                _options.zero = options.zero;
            if (options.places != undefined)
                _options.places = options.places;
            var parser = gerberParser(_options);
            var input = files[indf];
            var _AMBlockText = input.match(/%AM([a-zA-Z_.$][a-zA-Z_.0-9]+)([^%]*)%/g);
            var prevAMBlockLength = mapAMBlock.length;
            var prevDBlockLength = headerDBlockText.length;
            if (_AMBlockText) {
                AMBlockText = AMBlockText.concat(_AMBlockText);
            }
            for (var _AMBlockTextKey in _AMBlockText) {
                var _AMBKeyList = _AMBlockText[_AMBlockTextKey].match(/%AM([a-zA-Z_.$]+[a-zA-Z_.]+)([0-9]+)([^%]*)%/);
                var mapAMKey = 'f' + indf + 'a' + _AMBKeyList[2];
                if (indf == 0) {
                    AMBlockMaxValue = _AMBKeyList[2];
                    mapAMBlock.push([_AMBKeyList[1], _AMBKeyList[2], AMBlockMaxValue]);
                }
                if (indf > 0) {
                    AMBlockMaxValue++;
                    mapAMBlock.push([_AMBKeyList[1], _AMBKeyList[2], AMBlockMaxValue]);
                }
            }
            var parsedFile = parser.parseSync(input);
            var blockLetter = parser.format.filetype == 'gerber' ? 'D' : 'T';
            var fileText = input.split("\n");
            var fileCurLine = 0;
            
            var fileUnits = 'in';
            var headerEnded = false;
            var lineProcessed = false;

            var DBlockStarted = 0;
            var DBlockText = [];
            var ops = {};
            var places = [];
            var minMaxCoords = {x: {min: 1000, max: -1000}, y: {min: 1000, max: -1000}};

            DBlock[indf] = {};
            for (var i in parsedFile) {
//                if (parsedFile[i].line > 0 && parsedFile[i].line < 20000) console.log(JSON.stringify(parsedFile[i]));
                
                if (parser.format.filetype == 'drill')      //fix bug in parse-gerber with lines numbers
                    parsedFile[i].line--;

                lineProcessed = false;
                if (!headerEnded && parsedFile[i].type == 'set' && parsedFile[i].prop == 'units') {
                    fileUnits = parsedFile[i].value;
                }
                
                if (parsedFile[i].type == 'macro') {      //new AM block
                    lineProcessed = true;
                    headerEnded = true;
                    headerAMBlock[parsedFile[i].name] = parsedFile[i];
                }

                if (parsedFile[i].type == 'tool') {
                    headerEnded = true;
                    lineProcessed = true;
                    var mdbKey = 'f' + indf + 'd' + parsedFile[i].code;
                    headerDBlockText.push([fileText[parsedFile[i].line], parsedFile[i].code]);

                    if (indf == 0 && mapDBlock[mdbKey] == undefined) {
                        mapDBlock.push(parsedFile[i].code);          //just store original block
                        DBlockMaxValue = parsedFile[i].code;             //update max value for each D block
                    }
                    if (indf > 0 && mapDBlock[mdbKey] == undefined) {
                        DBlockMaxValue++;
                        mapDBlock.push(DBlockMaxValue);   //set new D block value
                    }
                }

                if (parsedFile[i].type == 'set' && parsedFile[i].prop == 'tool') {      //new D block
                    lineProcessed = true;
                    DBlockStarted = parsedFile[i].value;
                }

                if (parsedFile[i].type == 'op' && DBlockStarted) {      //Add coords to D block
                    if (minMaxCoords.x.min > parsedFile[i].coord.x)
                        minMaxCoords.x.min = parsedFile[i].coord.x;
                    if (minMaxCoords.x.max < parsedFile[i].coord.x)
                        minMaxCoords.x.max = parsedFile[i].coord.x;
                    if (minMaxCoords.y.min > parsedFile[i].coord.y)
                        minMaxCoords.y.min = parsedFile[i].coord.y;
                    if (minMaxCoords.y.max < parsedFile[i].coord.y)
                        minMaxCoords.y.max = parsedFile[i].coord.y;

                    lineProcessed = true;
                    if (DBlock[indf][DBlockStarted] == undefined)
                        DBlock[indf][DBlockStarted] = [];

                    if (options['init-coords'] && parsedFile[i].mode == 'G01') {
                        if (parsedFile[i].coord.x == undefined)
                            DBlock[indf][DBlockStarted].push({"type":"op","line":parsedFile[i].line,"op":"move","coord":{"y":0}});
                        if (parsedFile[i].coord.y == undefined)
                            DBlock[indf][DBlockStarted].push({"type":"op","line":parsedFile[i].line,"op":"move","coord":{"x":0}});
                    }
                    DBlock[indf][DBlockStarted].push(parsedFile[i]);
                }

                if ( fileCurLine < parsedFile[i].line ) {
                    for (var l = fileCurLine; l <= parsedFile[i].line; l++) {
                        if (!headerEnded) {
                            outFileText[l] = fileText[l];
                        }
                    }
                } else {
                    if (!headerEnded) {
                        outFileText[parsedFile[i].line] = fileText[parsedFile[i].line];
                    }
                }

                if (parsedFile[i].type == 'done') {      //get DONE line
                    doneDir = parsedFile[parsedFile[i].line];
                }

                fileCurLine = parsedFile[i].line;
            }
            if (allOptions['show-info']) {     //show info about file
                if (!fileUnits) {
                    console.warn(('Units definition not found, "' + options.units + '" will be used as default').red);
                }

                console.log('    Settings for file:');
                console.log('        Units:            ', fileUnits);
                console.log('        Type:             ', parser.format.filetype);
                console.log('        Zero:             ', parser.format.zero);
                console.log('        Places:           ', parser.format.places.join(','));
                console.log('        Min/Max:          ', JSON.stringify(minMaxCoords));
                if (options.units != fileUnits) {
                    console.log(('            WARNING: CLI units doen\'t equal to units from file! Please use units as in file.').cyan);
                }
            }
        }

        if (AMBlockText) {
            for (var amkey in mapAMBlock) {
                AMBlockText[amkey] = AMBlockText[amkey].replace(mapAMBlock[amkey][0] + mapAMBlock[amkey][1], mapAMBlock[amkey][0] + mapAMBlock[amkey][2]);
            }
            outFileText = outFileText.concat(AMBlockText);
        }

        if (headerDBlockText) {
            for (var bkey in headerDBlockText) {
                headerDBlockText[bkey] = headerDBlockText[bkey][0].replace(new RegExp(blockLetter + '0?' + headerDBlockText[bkey][1]), blockLetter + mapDBlock[bkey]);
            }
            outFileText = outFileText.concat(headerDBlockText);
        }

        if (parser.format.filetype == 'drill') {
            outFileText.push('%');  //End header for drill format
        }

        if (DBlock) {
            var cnt = 0;
            for (var indf in DBlock) {
                options = this.cloneOptions(allOptions, indf);
                for (var bid in DBlock[indf]) {
                    var mdbKey = 'f' + indf + 'd' + bid;
                    outFileText.push(blockLetter + mapDBlock[cnt] + (parser.format.filetype == 'gerber' ? '*' : ''));
                    DBlockText = this.formatCoordRow(DBlock[indf][bid], options, parser.format);
                    outFileText = outFileText.concat(DBlockText);
                    cnt++;
                }
            }
        }

        if (doneDir) {
            outFileText.push(doneDir + "\n");
        } else {
            if (parser.format.filetype == 'gerber')
                outFileText = outFileText.concat('M02*')
            else
                outFileText = outFileText.concat('M30')
        }

        return outFileText.join("\n");
    }

    formatCoordRow (DBlock, options, format) {
        var DBlockText = [];
        const numFormat = '0'.repeat(format.places[0]) + '.' + '0'.repeat(format.places[1]);
        for (var c = 0; c <= options.clone; c++) {
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
                lastXCoord = DBlock[b].coord.x != undefined ? DBlock[b].coord.x : lastXCoord;
                lastYCoord = DBlock[b].coord.y != undefined ? DBlock[b].coord.y : lastYCoord;
                DBlock[b].coord.x = lastXCoord + (c ? options.dx : 0) + (c ? 0 : options.sx);
                DBlock[b].coord.y = lastYCoord + (c ? options.dy : 0) + (c ? 0 : options.sy);
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


    cloneOptions(source, idx) {
        var newOptions = {};
        for (var o in source) {
            switch (o) {
                case 'dir' :
                    continue;
                break;
                case 'clone' :
                    if (source[o][idx] !== undefined)
                        newOptions[o] = source[o][idx]; 
                    else
                        newOptions[o] = source[o][source[o].length - 1];
                break;
                case 'dx' :
                case 'dy' :
                case 'sx' :
                case 'sy' :
                    if (source[o][idx] != undefined)
                        newOptions[o] = source[o][idx]; 
                    else
                        newOptions[o] = source[o][source[o].length - 1]; 
                break;
                case 'init-coords' :
                case 'zero' :
                case 'places' :
                case 'units' :
                    newOptions[o] = source[o];
                break;
            }
        }
        return newOptions;
    }
}

module.exports = {Merger};
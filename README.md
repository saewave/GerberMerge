# GerberMerge

## Requirements:

NodeJS - 0.6 or above  
Npm - not so old :)

## How to Install:
  * Clone `GerberMerge` or download zip and unpack
  * Navigate to `GerberMerge` dir
  * Run `npm install`
  
## How to use:

Before use `GerberMerge` you need to prepage Gerbers. Current version of `GerberMerge` accept `RS274X` only. Put your gerbers to default directory named `gerber_files` (otherwize you need to use `--dir` param to setup a default gerber dir). You can create subdir inside `gerber_files` or place files directly. 
Other main requrement - your gerber files should contain next extensions: `.gbl`, `.gbo`, `.gbs`, `.gml`, `.gtl`, `.gto`, `.gtp`, `.txt` (according to SparkFun’s CAM file for Eagle cad). Other files will be ignored. If you want to skip this filter and process all files use `--skip-ext-check`.

### Available options:

* **--in**    String - define input files or dirs to process (alternate path related to `--dir` option);
* `--clone`   Numeric, default = 1 - define how much time current board layer will be cloned;
* `--dir`     String, default = `gerber_files` - set base dir;
* `--dx`      Numeric, default = 0 - define offset by `X` for cloned board layer;
* `--dy`      see above
* `--units`   String, default = in - define units for dx, dy. Now used for compare with units in file and show warning. Available values `in` and `mm`;
* `--postfix` String, default = `_merged` - define postfix which will be added to generated file.
   * all options marked as **bold** are required.
   
Examples:
next command:
> node GerberMerge.js --in "Hub USB 2.0" --dy 1.289765
will process all files inside `/gerber_fiels/Hub USB 2.0`, clone each one one time and shift cloned layer to `1.289765` `inch` by `Y`.
> node GerberMerge.js --in "Hub USB 2.0/Hub USB 2.0.TXT" --clone 2 --dy .72
process only one file: `/gerber_fiels/Hub USB 2.0/Hub USB 2.0.TXT`, clone it twice and shift each layer to `0.72` `in` by `Y`

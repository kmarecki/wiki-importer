/// <reference path="typings/main.d.ts" />

import * as minimist from 'minimist';
import {Splitter} from './splitter';

var argv = minimist(process.argv.slice(2));
console.log(argv);

var splitter = new Splitter();
splitter.split(argv['xmlPath'], argv['outputDir']);
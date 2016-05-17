/// <reference path="typings/index.d.ts" />

process.env.UV_THREADPOOL_SIZE = 8;

import * as minimist from 'minimist';
import {Splitter} from './splitter';

var argv = minimist(process.argv.slice(2));
console.log(argv);

var splitter = new Splitter(argv['xmlPath'], argv['outputDir'], argv._);
splitter.split();
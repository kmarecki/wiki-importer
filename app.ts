/// <reference path="typings/index.d.ts" />

process.env.UV_THREADPOOL_SIZE = 8;

import * as minimist from 'minimist';
import {Splitter, SplitterOptions} from './splitter';

let argv = minimist(process.argv.slice(2));
console.log(argv);

let options = new SplitterOptions();
options.breakOnError = argv['breakOnError'];
options.languages = argv._;
options.namespaces = argv['namespace'] ? [argv['namespace']] : undefined;
options.outputDir = argv['outputDir'];
options.raw = argv['raw'];
options.xmlPath = argv['xmlPath'];
options.verbose = argv['verbose'];
options.equalitySearch = argv['equalitySearch'];
options.stripCategories = true;
options.exportPage = true;
options.adapter = argv['adapter'];

let splitter = new Splitter(options);
splitter.split();

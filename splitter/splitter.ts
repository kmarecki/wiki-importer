import * as _ from 'lodash';
import * as sax from 'sax';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as util from 'util';

import { AdapterFactory } from './../adapters/adapterFactory';
import { Adapter } from './../adapters/adapter';
import { WikiExporter } from '../wikiexporter';
import { WikiParser } from '../parser/wikiParser';

import { EnglishGermanExporter } from '../exporters/en/german';

import { PageSplitter } from './pageSplitter';
import { Page, TextPart} from './parts';
import { SaxReader } from './saxReader';


var readlineSync = require('readline-sync');



export class SplitterOptions {
    xmlPath: string;
    outputDir: string;
    namespaces: number[];
    languages: string[];
    raw: boolean;
    breakOnError: boolean;
    verbose: boolean;
    equalitySearch: boolean;
    stripCategories: boolean;
    exportPage: boolean;
    adapter: string;
}

export class Splitter {
    private currentTag: sax.Tag;
    private options: SplitterOptions;
    private pageCount: number;

    private wikiSplitter = new PageSplitter();
    private wikiParser = new WikiParser();
    private wikiExporter = new EnglishGermanExporter();
    private wikiAdapter: Adapter;

    constructor(options: SplitterOptions) {
        this.options = options;
        this.wikiParser.debugInfo = options.verbose;
        this.wikiParser.stripCategories = options.stripCategories;
        this.wikiAdapter = AdapterFactory.createAdapter(options.adapter);
    }

    private isPageValid(ns: number, title: string): boolean {
        if (!this.options.namespaces || this.options.namespaces.indexOf(ns) > -1) {
            if (title) {
                return true;
            }
        }
        return false;
    }

    private isLanguageValid(language: string): boolean {
        if (this.options.languages.length != 0) {
            if (this.options.equalitySearch) {
                if (!_.includes(this.options.languages, language)) {
                    return false;
                }
            }
            else {
                if (!_.find(this.options.languages, lang => language.indexOf(lang) > - 1)) {
                    return false;
                }
            }
        }
        return true
    }

    private saveFile(filename: string, data: any): void {
        var dirname = path.dirname(filename);
        fs.ensureDir(dirname, err => fs.writeFile(filename, JSON.stringify(data, null, 4)));
    }

    private saveRawPage(raw: any): void {
        console.log(`${this.pageCount} ${raw.title}`);
        let filename = path.join(this.options.outputDir, raw.title);
        this.saveFile(filename, raw);
    }

    private saveParsedPage(raw: any): void {
        for (let language of this.wikiSplitter.splitH2(this.wikiAdapter, raw.revision.text)) {
            const lang = this.wikiAdapter.getEntryLanguage(language.value);
            
            // console.log(`Lang: ${lang}, ${language.value}`);
            if (this.isLanguageValid(lang)) {
                const page = new Page();
                page.title = raw.title;
                page.revisionId = raw.revision.id;
                page.timestamp = raw.revision.timestamp;
                page.text = language.text;
                page.parsed = this.wikiParser.parse(language.text);
                if (this.options.exportPage) {
                    page.exported = this.wikiExporter.export(page.title, page.parsed);
                }

                let filename = path.join(this.options.outputDir, lang, _.last(page.title.split('/')));
                console.log(`${this.pageCount} ${page.title}, ${lang}, ${filename}`);
                this.saveFile(filename, page);
            }
        }
    }

    private savePage(raw: any): void {
        if (this.isPageValid(raw.ns, raw.title)) {
            try {
                if (this.options.raw) {
                    this.saveRawPage(raw);
                } else {
                    this.saveParsedPage(raw);
                }
                this.pageCount++;
            } catch (e) {
                let errorfilename = path.join(this.options.outputDir, '_errors', (this.pageCount++).toString());
                let data = {
                    error: { message: e.message, stack: e.stack },
                    raw: raw
                }
                console.log(e.name + ': ' + e.message);
                console.log(errorfilename);
                if (this.options.breakOnError) {
                    readlineSync.question('');
                }
                this.saveFile(errorfilename, data);
            }
        }
    }

    split(): void {
        var reader: SaxReader;
        var saxStream = sax.createStream(true, {});
        this.pageCount = 1;
        saxStream.on('error', function (e) {
            console.error('error!', e);
            this._parser.error = null;
            this._parser.resume();
        });
        saxStream.on('opentag', (tag: sax.Tag) => {
            this.currentTag = tag;
            if (tag.name == 'page') {
                if (!reader) {
                    reader = new SaxReader();
                }
                reader.clear();
            }
            if (reader) {
                reader.openTag(tag);
            }
        });
        saxStream.on('text', text => {
            if (reader) {
                text = text.trim();
                reader.setTagText(text);
            }
        });
        saxStream.on('closetag', tag => {
            this.currentTag = null;
            if (tag == 'page') {
                var raw = <any>reader.toObject();
                this.savePage(raw);
            }
            if (reader) {
                reader.closeTag(tag);
            }
        });

        fs.exists(this.options.xmlPath, (exists) => {
            if (!exists) {
                console.log(this.options.xmlPath + ' not exist');
            }
        });
        fs.createReadStream(this.options.xmlPath)
            .pipe(saxStream)
            .on('finish', () => {
                //TODO Fix it, it doesn't work
                console.log("Import is completed");
            });
    }
}

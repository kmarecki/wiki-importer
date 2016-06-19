import * as _ from 'lodash';
import * as sax from 'sax';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as util from 'util';

import {WikiExporter} from './wikiexporter';
import {WikiParser} from './wikiparser';

import {EnglishGermanExporter} from './exporters/en/german';

var readlineSync = require('readline-sync');

class Page {
    title: string;
    text: string;
    parsed: any;
    exported: any;
    revisionId: number;
    timestamp: Date
}

class SaxReader {

    objects: Object[];
    tags: string[];

    private get currentTag(): string {
        return _.last(this.tags);
    }

    private get currentObject(): Object {
        return _.last(this.objects);
    }

    private get rootObject(): Object {
        return _.first(this.objects);
    }

    clear(): void {
        this.objects = null;
        this.tags = null;

    }

    openTag(tag: sax.Tag): void {
        if (this.objects == null) {
            this.objects = [new Object()];
            this.tags = [tag.name];
        } else {
            var propertyName = tag.name;
            Object.defineProperty(this.currentObject, propertyName, {
                enumerable: true,
                writable: true,
                value: new Object
            });
            this.tags.push(propertyName);
            this.objects.push(this.currentObject[propertyName]);
        }
    }

    setTagText(text: string): void {
        if (text) {
            this.currentObject['#text'] = text;
        }
    }

    private reduceObject(object: Object): void {
        for (var propertyName of Object.getOwnPropertyNames(object)) {
            var childObject = object[propertyName];
            if (Object.getOwnPropertyNames(childObject).length == 1) {
                object[propertyName] = childObject["#text"];
            }
        }
    }

    closeTag(tag: string): void {
        if (this.currentTag && tag) {
            if (this.currentTag == tag) {
                this.tags.pop();
                this.reduceObject(this.currentObject);
                this.objects.pop();
            } else {
                throw Error(`Cannot close ${tag} tag, the current tag is ${this.currentTag}`);
            }
        }
    }

    toObject(): Object {
        this.reduceObject(this.rootObject);
        return this.rootObject;
    }
}

class TextPart {
    value: string;
    text: string;
}

class WikiSplitter {

    splitH2(text: string): TextPart[] {
        var parts: TextPart[] = [];
        var currentPart: TextPart;
        for (var line of text.split('\n')) {
            if (line.match(/^==[^=\|[\n\r\t.,'\"\+!?]+==/g)) {
                if (currentPart != null) {
                    parts.push(currentPart);
                }
                currentPart = new TextPart();
                currentPart.value = line.replace(/=/g, '').trim();
                currentPart.text = line;
            } else {
                if (currentPart != null) {
                    currentPart.text = currentPart.text + '\n' + line;
                }
            }
        }
        if (currentPart != null) {
            parts.push(currentPart);
        }
        return parts;
    }
}

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
}

export class Splitter {
    private currentTag: sax.Tag;
    private options: SplitterOptions;
    private pageCount: number;

    private wikiSplitter = new WikiSplitter();
    private wikiParser = new WikiParser();
    private wikiExporter = new EnglishGermanExporter();

    constructor(options: SplitterOptions) {
        this.options = options;
        this.wikiParser.debugInfo = options.verbose;
        this.wikiParser.stripCategories = options.stripCategories;
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
        if (this.isLanguageValid(raw.title)) {
            console.log(`${this.pageCount} ${raw.title}`);
            let filename = path.join(this.options.outputDir, raw.title);
            this.saveFile(filename, raw);
        }
    }

    private saveParsedPage(raw: any): void {
        for (let language of this.wikiSplitter.splitH2(raw.revision.text)) {
            if (this.isLanguageValid(language.value)) {
                let page = new Page();
                page.title = raw.title;
                page.revisionId = raw.revision.id;
                page.timestamp = raw.revision.timestamp;
                page.text = language.text;
                page.parsed = this.wikiParser.parse(language.text);
                page.exported = this.wikiExporter.export(page.title, page.parsed);

                let filename = path.join(this.options.outputDir, language.value, _.last(page.title.split('/')));
                console.log(`${this.pageCount} ${page.title}, ${page.exported.lexem.part} - ${language.value}, ${filename}`);
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
        fs.createReadStream(this.options.xmlPath).pipe(saxStream);
    }
}

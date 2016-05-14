import * as _ from 'lodash';
import * as sax from 'sax';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as util from 'util';

var readlineSync = require('readline-sync');

class Page {
    title: string;
    text: string;
    revisionId: number;
    timestamp: Date
}

class SaxObjectReader {

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
        if (tag) {
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

class WikiTemplateParser {

    splitH2(text: string): TextPart[] {
        var parts: TextPart[] = [];
        var currentPart: TextPart;
        for (var line of text.split('\n')) {
            if (line.match(/^==[^=\|[\n\r\t.,'\"\+!?-]+==/g)) {
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

export class Splitter {
    private currentTag: sax.Tag;
    private xmlPath: string;
    private outputDir: string;
    private languages: string[];
    private tagCount: number;

    private wikiParser = new WikiTemplateParser();

    constructor(xmlPath: string, outputDir: string, languages: string[]) {
        this.xmlPath = xmlPath;
        this.outputDir = outputDir;
        this.languages = languages;
    }

    private savePage(raw: any): void {
        if (raw.ns == 0) {
            if (raw.title) {
                try {
                    for (var language of this.wikiParser.splitH2(raw.revision.text)) {
                        if (this.languages.length == 0 || _.includes(this.languages, language.value)) {
                            let page = new Page();
                            page.title = raw.title.replace('/', '_');
                            page.revisionId = raw.revision.id;
                            page.timestamp = raw.revision.timestamp;
                            page.text = language.text;

                            let filename = path.join(this.outputDir, language.value, page.title);
                            let dirname = path.dirname(filename);
                            console.log(`${this.tagCount} ${page.title} - ${language.value}, ${filename} ${dirname}`);

                            fs.ensureDir(dirname, err => fs.writeFile(filename, JSON.stringify(page, null, 4)));
                        }
                        this.tagCount++;
                    }
                } catch (e) {
                    let errorfilename = path.join(this.outputDir, '_errors', (this.tagCount++).toString());
                    let data = {
                        error: { message: e.message, stack: e.stack },
                        raw: raw
                    }
                    console.log(e.name + ': ' + e.message);
                    console.log(errorfilename);
                    readlineSync.question('');
                    let dirname = path.dirname(errorfilename);
                    fs.ensureDir(dirname, err => fs.writeFile(errorfilename, JSON.stringify(data, null, 4)));
                }
            }
        }
    }

    split(): void {
        var reader: SaxObjectReader;
        var saxStream = sax.createStream(true, {});
        this.tagCount = 1;
        saxStream.on('error', function (e) {
            console.error('error!', e);
            this._parser.error = null;
            this._parser.resume();
        });
        saxStream.on('opentag', (tag: sax.Tag) => {
            this.currentTag = tag;
            if (tag.name == 'page') {
                if (!reader) {
                    reader = new SaxObjectReader();
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

        fs.exists(this.xmlPath, (exists) => {
            if (!exists) {
                console.log(this.xmlPath + ' not exist');
            }
        });
        fs.createReadStream(this.xmlPath).pipe(saxStream);
    }
}

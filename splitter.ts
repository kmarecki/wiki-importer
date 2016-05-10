import * as _ from 'lodash';
import * as sax from 'sax';
import * as fs from 'fs';
import * as util from 'util';

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
        for(var propertyName of Object.getOwnPropertyNames(object)) {
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

export class Splitter {
    private currentTag: sax.Tag;

    split(xmlPath: string, outputDir: string): void {
        var reader: SaxObjectReader;
        var saxStream = sax.createStream(true, {});
        var tagCount = 1;
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
                var page = reader.toObject();
                console.log(JSON.stringify(page));
            }
            if (reader) {
                reader.closeTag(tag);
            }
        });
       
        fs.exists(xmlPath, (exists) => {
            if (!exists) {
                console.log(xmlPath + ' not exist');
            }
        });
        fs.createReadStream(xmlPath).pipe(saxStream);
    }
}

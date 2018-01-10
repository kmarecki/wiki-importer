import * as _ from 'lodash';
import * as sax from 'sax';
export class SaxReader {

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
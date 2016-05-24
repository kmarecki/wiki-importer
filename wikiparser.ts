/// <reference path="typings/index.d.ts" />
import * as _ from 'lodash';
import * as XRegExp from 'xregexp';

export class WikiParser {
    TEXT_PROPERTY_NAME = '#text';
    //\u0301 - accented Cyrilic 
    private letterregex = '\\pL\\p{Cyrillic}\\p{Hebrew}\u0301';
    private splitregex = '\*\#';
    private h1regex = XRegExp(`=[ ${this.letterregex}]+=`);
    private h2regex = XRegExp(`==[ ${this.letterregex}]+==`);
    private h3regex = XRegExp(`===[ ${this.letterregex}]+===`);
    private h4regex = XRegExp(`====[ ${this.letterregex}]+====`);
    private split1regex = XRegExp(`[\s][${this.splitregex}][\s]`);
    private split2regex = XRegExp(`[${this.splitregex}]{2}(?![${this.splitregex}]+)`);
    private split3regex = XRegExp(`[${this.splitregex}]{3}(?![${this.splitregex}]+)`);
    private templateregex = XRegExp(`^\{\{[${this.letterregex} -|\.\n]+\}\}`);
    private templatesplitregex = XRegExp(`\\|(?![${this.letterregex}|]+\})`);
    private assignmentregex = XRegExp(`[ ${this.letterregex}]+[=][${this.letterregex} {}|\n]`);
    private assignmentoutsideregex = XRegExp(`^[ ${this.letterregex}-]+[:]`);
    private categoryregex = XRegExp(`\[\[[ ${this.letterregex}]+:.+\]\]`, 'g');

    private objects: Object[];
    private currentLevel: number;
    private currentText: string = '';

    private _debugInfo: boolean;
    public get debugInfo(): boolean {
        return this._debugInfo;
    }

    public set debugInfo(value: boolean) {
        this._debugInfo = value;
    }

    private _stripCategories: boolean;
    public get stripCategories(): boolean {
        return this._stripCategories;
    }

    public set stripCategories(value: boolean) {
        this._stripCategories = value;
    }

    private reset(): void {
        this.objects = [{}];
        this.currentLevel = 0;
        this.currentText = '';
    }

    private get currentObject(): Object {
        return _.last(this.objects);
    }

    private get rootObject(): Object {
        return _.first(this.objects);
    }


    private matchHeader(line: string): number {

        if (this.h4regex.test(line)) {
            return 4;
        }
        if (this.h3regex.test(line)) {
            return 3;
        }
        if (this.h2regex.test(line)) {
            return 2;
        }
        if (this.h1regex.test(line)) {
            return 1;
        }

        return -1;
    }

    private getHeaderValue(header: string): string {
        return header.replace(/=/g, '').trim();
    }

    private tryParseTemplate(text: string): string[] {
        if (text.match(this.templateregex)) {
            text = text.trim().replace(/^{{/g, '').replace(/}}$/g, '');
            return text.split(this.templatesplitregex);
        }
        return null;
    }

    private tryParseAssignment(text: string): string[] {
        if (text.match(this.assignmentoutsideregex)) {
            // can't use text.split(/[:]/), it splits multiple times
            var i = text.indexOf(':');
            return [text.slice(0, i), text.slice(i + 1)];
        }
        if (text.match(this.assignmentregex)) {
            return text.split(/[=]/g);
        }
        return null;
    }

    private normalizeChild(child: string): string {
        if (this.stripCategories) {
            child = child.replace(this.categoryregex, '');
        }
        return child.replace(/\*\*:/g, '***');
    }
    private addProperty(propertyName: string, childs: string[], currentObject: Object, splitLevel: number): void {
        currentObject[propertyName] = {};
        if (childs) {
            splitLevel++;
            for (var child of childs) {
                if (this.debugInfo) {
                    console.log('Child: ' + child);
                }
                var regex = splitLevel == 2 ? /(^|[\s])([\*\#]{2}|\#\*)[\s]/g : /(^|[\s])([\*\#]{3}|\#\*)[\s]/g;
                // var splitted = child.split(/[\*\#]{2}/g);
                var splitted = this.normalizeChild(child).split(regex);
                for (var splitedPart of splitted) {
                    if (this.debugInfo) {
                        console.log(`Split${splitLevel}: ${splitedPart}`);
                    }
                    this.tryParseText(splitedPart, currentObject[propertyName], splitLevel);
                }
            }
        }
    }

    private addPropertyFromParseResult(parsed: string[], currentObject: Object, splitLevel: number): void {
        var propertyName = parsed[0].trim();
        var childs = parsed.slice(1);
        this.addProperty(propertyName, childs, currentObject, splitLevel);
    }

    private addTextProperty(text: string, currentObject: Object): void {
        if (this.stripCategories) {
            text = text.replace(this.categoryregex, '');
        }
        text = text.replace(/[\n\#\*]/g, '');
        if (text) {

            if (!currentObject[this.TEXT_PROPERTY_NAME]) {
                currentObject[this.TEXT_PROPERTY_NAME] = text;
            } else {
                if (!(currentObject[this.TEXT_PROPERTY_NAME] instanceof Array)) {
                    currentObject[this.TEXT_PROPERTY_NAME] = [currentObject[this.TEXT_PROPERTY_NAME]];
                }
                (<[]>currentObject[this.TEXT_PROPERTY_NAME]).push(text);
            }
        }
    }

    private tryParseText(text: string, currentObject: Object, splitLevel: number): void {
        if (text) {
            text = text.trim();
            var parsed = this.tryParseTemplate(text);
            if (parsed) {
                this.addPropertyFromParseResult(parsed, currentObject, splitLevel);
            } else {
                parsed = this.tryParseAssignment(text);
                if (parsed) {
                    this.addPropertyFromParseResult(parsed, currentObject, splitLevel);
                } else {
                    this.addTextProperty(text, currentObject);
                }
            }
        }
    }

    private saveCurrentText(): void {
        if (this.currentText) {
            var splitted = this.currentText.split(/(^|[\s])([\*\#]|\#\*)[\s]/g);
            //var splitted = this.currentText.split(this.split1regex);
            for (var splittedPart of splitted) {
                if (splittedPart) {
                    console.log('Split: ' + splittedPart);
                    this.tryParseText(splittedPart, this.currentObject, 1);
                }
            }
            this.currentText = '';
        }
    }

    private addNewHeader(value: string): void {
        this.addProperty(value, null, this.currentObject, 1);
        this.objects.push(this.currentObject[value]);
    }

    parse(text: string): any {
        if (text) {
            this.reset();
            for (var line of text.split('\n')) {
                var level = this.matchHeader(line);
                if (level > 0) {
                    this.saveCurrentText();

                    var headerValue = this.getHeaderValue(line);
                    if (this._debugInfo) {
                        console.log(level + ' ' + headerValue);
                    }

                    if (level > this.currentLevel) {
                        //Add child header
                        this.saveCurrentText();
                        this.addNewHeader(headerValue);
                    } else {
                        //Save header value, return to parent header
                        this.saveCurrentText();
                        for (let i = 0; i <= this.currentLevel - level; i++) {
                            this.objects.pop();
                        }
                        this.addNewHeader(headerValue);
                    }
                    this.currentLevel = level;
                } else {
                    this.currentText = this.currentText + '\n' + line;
                }
            }
            this.saveCurrentText();
            return this.rootObject;
        }
    }
}


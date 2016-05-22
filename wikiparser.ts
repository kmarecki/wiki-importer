/// <reference path="typings/index.d.ts" />
import * as _ from 'lodash';
import * as XRegExp from 'xregexp';

export class WikiParser {
    TEXT_PROPERTY_NAME = '#text';
    private letterregex = '\\pL\\p{Hebrew}'; v
    private h1regex = XRegExp(`=[ ${this.letterregex}]+=`);
    private h2regex = XRegExp(`==[ ${this.letterregex}]+==`);
    private h3regex = XRegExp(`===[ ${this.letterregex}]+===`);
    private h4regex = XRegExp(`====[ ${this.letterregex}]+====`);
    private splitregex = XRegExp('[\*\#]+');
    private templateregex = XRegExp(`^\{\{[${this.letterregex} -|\.]+\}\}`);
    private templatesplitregex = XRegExp(`\\|(?![${this.letterregex}|]+\})`);
    private assignmentregex = XRegExp(`[${this.letterregex} ]+=[${this.letterregex} {}|\n]+`);
    private categoryregex = XRegExp(`\[\[[ ${this.letterregex}]+:[ ${this.letterregex}]+\]\]`, 'g');

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
        if (text.match(this.assignmentregex)) {
            return text.split('=');
        }
        return null;
    }

    private addPropertyFromParseResult(parsed: string[], currentObject: Object): void {
        var propertyName = parsed[0].trim();
        var childs = parsed.slice(1);
        this.addProperty(propertyName, childs, currentObject);
    }

    private addProperty(propertyName: string, childs: string[], currentObject: Object): void {
        currentObject[propertyName] = {};
        if (childs) {
            for (var child of childs) {
                this.tryParseText(child, currentObject[propertyName]);
            }
        }
    }

    private addTextProperty(text: string, currentObject: Object): void {
        if (this.stripCategories) {
            text = text.replace(this.categoryregex, '');
        }
        if (!currentObject[this.TEXT_PROPERTY_NAME]) {
            currentObject[this.TEXT_PROPERTY_NAME] = text;
        } else {
            if (!(currentObject[this.TEXT_PROPERTY_NAME] instanceof Array)) {
                currentObject[this.TEXT_PROPERTY_NAME] = [currentObject[this.TEXT_PROPERTY_NAME]];
            }
            (<[]>currentObject[this.TEXT_PROPERTY_NAME]).push(text);
        }
    }

    private tryParseText(text: string, currentObject: Object): void {
        if (text) {
            text = text.trim();
            var parsed = this.tryParseTemplate(text);
            if (parsed) {
                this.addPropertyFromParseResult(parsed, currentObject);
            } else {
                parsed = this.tryParseAssignment(text);
                if (parsed) {
                    this.addPropertyFromParseResult(parsed, currentObject);
                } else {
                    this.addTextProperty(text, currentObject);
                }
            }
        }
    }

    private saveCurrentText(): void {
        if (this.currentText) {
            var splitted = this.currentText.split(this.splitregex);
            for (var splittedPart of splitted) {
                this.tryParseText(splittedPart, this.currentObject);
            }
            this.currentText = '';
        }
    }

    private addNewHeader(value: string): void {
        this.addProperty(value, null, this.currentObject);
        this.objects.push(this.currentObject[value]);
    }

    parse(text: string): any {
        if (text) {
            this.reset();
            for (var line of text.split('\n')) {
                var level = this.matchHeader(line);
                if (level > 0) {
                    var headerValue = this.getHeaderValue(line);
                    if (this._debugInfo) {
                        console.log(level + ' ' + headerValue);
                    }

                    this.saveCurrentText();

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
                    this.currentText = this.currentText + line;
                }
            }
            this.saveCurrentText();
            return this.rootObject;
        }
    }
}


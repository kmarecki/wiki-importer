import * as _ from 'lodash';
import * as XRegExp from 'xregexp';

import { ExprParserOptions, ParserConsts } from './exprParser';
import { AssignmentOutsideParser } from './assignmentOutsideParser';
import { AssignmentParser } from './assignmentParser';
import { OutsideTemplateParser } from './outsideTemplateParser';
import { ParenthesedTemplateParser } from './parenthesedTemplateParser';
import { TemplateParser } from './templateParser';
import { TextLineExprParser } from './textLineExprParser';
import { TextWithChildExprParser } from './textWithchildExprParser';


export class WikiParser {

    private letterregex = '\\pL\\p{Cyrillic}\\p{Hebrew}\\p{M}';
    private splitregex = '\*\#';
    private h1regex = XRegExp(`=[ ${this.letterregex}\{\}\(\)]+=`);
    private h2regex = XRegExp(`==[ ${this.letterregex}\{\}\(\)]+==`);
    private h3regex = XRegExp(`===[ ${this.letterregex}\{\}\(\)]+===`);
    private h4regex = XRegExp(`====[ ${this.letterregex}\{\}\(\)]+====`);
    private split1regex = XRegExp(`[\s][${this.splitregex}][\s]`);
    private split2regex = XRegExp(`[${this.splitregex}]{2}(?![${this.splitregex}]+)`);
    private split3regex = XRegExp(`[${this.splitregex}]{3}(?![${this.splitregex}]+)`);
    private categoryregex = XRegExp(`\[\[[ ${this.letterregex}]+:.+\]\]`, 'g');

    private objects: Object[];
    private currentLevel: number;
    private currentText: string = '';

    private expParsers = [
        new OutsideTemplateParser(),
        new TemplateParser(),
        new ParenthesedTemplateParser(),
        new AssignmentOutsideParser(),
        new AssignmentParser(),
        new TextWithChildExprParser(),
        new TextLineExprParser()
    ]

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

    private normalizeChild(child: string): string {
        if (this.stripCategories) {
            child = child.replace(this.categoryregex, '');
        }
        return child.replace(/\*\*:/g, '***');
    }

    private setPropertyValue(currentObject: Object, propertyName: string, value: any): void {
        if (!currentObject[propertyName]) {
            currentObject[propertyName] = value;
        } else {
            if (!(currentObject[propertyName] instanceof Array)) {
                currentObject[propertyName] = [currentObject[propertyName]];
            }
            (<Array<object>>currentObject[propertyName]).push(value);
        }
    }


    private addProperty(propertyName: string, childs: string[], currentObject: Object, splitLevel: number): void {
        let childObject = {};
        this.setPropertyValue(currentObject, propertyName, childObject);
        if (childs) {
            splitLevel++;
            for (let child of childs) {
                if (this.debugInfo) {
                    console.log('Child: ' + child);
                }
                let regex = splitLevel === 2 ? /(^|[\s])([\*\#]{2}|\#\*)[\s]/g : /(^|[\s])([\*\#]{3}|\#\*)[\s]/g;
                // let splitted = child.split(/[\*\#]{2}/g);
                let splitted = this.normalizeChild(child).split(regex);
                for (let splitedPart of splitted) {
                    if (this.debugInfo) {
                        console.log(`Split${splitLevel}: ${splitedPart}`);
                    }
                    this.tryParseText(splitedPart, childObject, splitLevel);
                }
            }
        }
    }

    private addPropertyFromParseResult(parsed: string[], currentObject: Object, splitLevel: number): void {
        let propertyName = parsed[0].trim();
        let childs = parsed.slice(1);
        this.addProperty(propertyName, childs, currentObject, splitLevel);
    }


    private addTextProperty(text: string, currentObject: Object): void {
        if (this.stripCategories) {
            // text = text.replace(this.categoryregex, '');
        }
        text = text.replace(/[\n\#\*]/g, '');
        if (text) {
            this.setPropertyValue(currentObject, ParserConsts.TEXT_PROPERTY_NAME, text);
        }
    }

    private getExprParserOptions(splitLevel: number): ExprParserOptions {
        return {
            debugInfo: this.debugInfo,
            stripCategories: this.stripCategories,
            splitLevel: splitLevel
        };
    }

    private tryParseText(text: string, currentObject: Object, splitLevel: number): void {
        if (text) {

            text = text.trim();
            let parsed = false;
            for (let parser of this.expParsers) {
                let result = parser.tryParse(text, this.getExprParserOptions(splitLevel));
                if (result) {
                    parsed = true;
                    if (result.isText) {
                        this.addTextProperty(result.parsed[0], currentObject);
                    } else {
                        this.addPropertyFromParseResult(result.parsed, currentObject, splitLevel);
                    }
                    if (result.rest && result.rest.length > 0) {
                        this.tryParseText(result.rest, currentObject, splitLevel);
                    }
                    break;
                }
            }
            if (!parsed) {
                this.addTextProperty(text, currentObject);
            }
        }
    }

    private saveCurrentText(): void {
        if (this.currentText) {
            let splitted = this.currentText.split(/(^|[\s])([\*\#])[\s]/g);
            //let splitted = this.currentText.split(this.split1regex);
            for (let splittedPart of splitted) {
                if (splittedPart) {
                    if (this.debugInfo) {
                        console.log('Split1: ' + splittedPart);
                    }
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
            for (let line of text.split('\n')) {
                let level = this.matchHeader(line);
                if (level > 0) {
                    this.saveCurrentText();

                    let headerValue = this.getHeaderValue(line);
                    if (this._debugInfo) {
                        console.log(`Found header ${level} ${headerValue}`);
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


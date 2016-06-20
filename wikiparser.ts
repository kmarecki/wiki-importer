/// <reference path="typings/index.d.ts" />
import * as _ from 'lodash';
import * as XRegExp from 'xregexp';

class RegExes {
    static letterregex = '\\pL\\p{Cyrillic}\\p{Hebrew}\u0301\\p{M}';
}

interface ParseResult {
    parsed: string[];
    rest?: string;
}

interface ExprParserOptions {
    debugInfo: boolean;
    stripCategories: boolean;
    splitLevel: number;
}

interface ExprParser {
    tryParse(text: string, options?: ExprParserOptions): ParseResult;
}

class TemplateParser implements ExprParser {
    // \{\} in [] because we want match last pair of }}, + has to work as greedy operator
    private templateregex = XRegExp(`^\{\{[${RegExes.letterregex} -|\.\n\{\}]+\}\}`);
    private templatesplitregex = XRegExp(`\\|(?![${RegExes.letterregex}|]+\})`);

    tryParse(text: string, options?: ExprParserOptions): ParseResult {
        let match = text.match(this.templateregex);
        if (match) {
            let tosplit = match[0].trim().replace(/^{{/g, '').replace(/}}$/g, '');
            let rest = text.replace(match[0], '');
            if (options && options.debugInfo) {
                console.log('text: ' + text);
                console.log('match.length' + match.length);
                console.log(`Found template:${match[0]}`);
                console.log(`rest:${rest}`);
            }
            return {
                parsed: tosplit.split(this.templatesplitregex),
                rest: rest
            };
        }
        return undefined;
    }
}

class AssignmentOutsideParser implements ExprParser {
    private assignmentoutsideregex = XRegExp(`^[ ${RegExes.letterregex}-]+[:]`);

    tryParse(text: string, options?: ExprParserOptions): ParseResult {
        if (text.match(this.assignmentoutsideregex)) {
            // can't use text.split(/[:]/), it splits multiple times
            let i = text.indexOf(':');
            return {
                parsed: [text.slice(0, i), text.slice(i + 1)]
            };
        }
        return undefined;
    }
}

class AssignmentParser implements ExprParser {
    private assignmentregex = XRegExp(`[ ${RegExes.letterregex}]+[=][${RegExes.letterregex} {}|\n]`);

    tryParse(text: string, options?: ExprParserOptions): ParseResult {

        if (text.match(this.assignmentregex)) {
            return {
                parsed: text.split(/[=]/g)
            };
        }
        return undefined;
    }
}

class TextWithChildExprParser implements ExprParser {

    tryParse(text: string, options?: ExprParserOptions): ParseResult {
        let regex = options.splitLevel === 2 ? /(^|[\s])([\*\#]{2}|\#\*)[\s]/g : /(^|[\s])([\*\#]{3}|\#\*)[\s]/g;
        let splitted = text.split(regex);
        if (splitted.length > 1) {
            splitted.unshift(WikiParser.TEXT_PROPERTY_NAME);
            return {
                parsed: splitted
            };
        }
        return undefined;
    }
}

export class WikiParser {
    static TEXT_PROPERTY_NAME = '#text';
    private letterregex = '\\pL\\p{Cyrillic}\\p{Hebrew}\\p{M}';
    private splitregex = '\*\#';
    private h1regex = XRegExp(`=[ ${this.letterregex}]+=`);
    private h2regex = XRegExp(`==[ ${this.letterregex}]+==`);
    private h3regex = XRegExp(`===[ ${this.letterregex}]+===`);
    private h4regex = XRegExp(`====[ ${this.letterregex}]+====`);
    private split1regex = XRegExp(`[\s][${this.splitregex}][\s]`);
    private split2regex = XRegExp(`[${this.splitregex}]{2}(?![${this.splitregex}]+)`);
    private split3regex = XRegExp(`[${this.splitregex}]{3}(?![${this.splitregex}]+)`);
    private categoryregex = XRegExp(`\[\[[ ${this.letterregex}]+:.+\]\]`, 'g');

    private objects: Object[];
    private currentLevel: number;
    private currentText: string = '';

    private expParsers = [
        new TemplateParser(),
        new AssignmentOutsideParser(),
        new AssignmentParser(),
        new TextWithChildExprParser()
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
    private addProperty(propertyName: string, childs: string[], currentObject: Object, splitLevel: number): void {
        currentObject[propertyName] = {};
        if (childs) {
            splitLevel++;
            for (let child of childs) {
                if (this.debugInfo) {
                    console.log('Child: ' + child);
                }
                let regex = splitLevel == 2 ? /(^|[\s])([\*\#]{2}|\#\*)[\s]/g : /(^|[\s])([\*\#]{3}|\#\*)[\s]/g;
                // let splitted = child.split(/[\*\#]{2}/g);
                let splitted = this.normalizeChild(child).split(regex);
                for (let splitedPart of splitted) {
                    if (this.debugInfo) {
                        console.log(`Split${splitLevel}: ${splitedPart}`);
                    }
                    this.tryParseText(splitedPart, currentObject[propertyName], splitLevel);
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
            text = text.replace(this.categoryregex, '');
        }
        text = text.replace(/[\n\#\*]/g, '');
        if (text) {

            if (!currentObject[WikiParser.TEXT_PROPERTY_NAME]) {
                currentObject[WikiParser.TEXT_PROPERTY_NAME] = text;
            } else {
                if (!(currentObject[WikiParser.TEXT_PROPERTY_NAME] instanceof Array)) {
                    currentObject[WikiParser.TEXT_PROPERTY_NAME] = [currentObject[WikiParser.TEXT_PROPERTY_NAME]];
                }
                (<[]>currentObject[WikiParser.TEXT_PROPERTY_NAME]).push(text);
            }
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
                    this.addPropertyFromParseResult(result.parsed, currentObject, splitLevel);
                    parsed = true;
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


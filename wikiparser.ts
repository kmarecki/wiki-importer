/// <reference path="typings/index.d.ts" />
import * as _ from 'lodash';
import * as XRegExp from 'xregexp';

class RegExes {
    static letterregex = '\\pL\\p{Cyrillic}\\p{Hebrew}\u0301\\p{M}';
}

interface ParseResult {
    parsed: string[];
    rest?: string;
    isText?: boolean;
}

interface ExprParserOptions {
    debugInfo: boolean;
    stripCategories: boolean;
    splitLevel: number;
}

interface ExprParser {
    tryParse(text: string, options?: ExprParserOptions): ParseResult;
}

//(1.1) {{ekon}} {{hand}} [[cena]]
//(1.1-3) {{odmiana-rzeczownik-czeski|Mianownik lp    = cena|Mianownik lm   = ceny}}"
class ParenthesedTemplateParser implements ExprParser {

    private nameregex = /[\d\.\-\(\)]/;
    private trailingregex = /[ ]/;
    private match(text: string): { matches: string[], rest: string } {
        const matches: Array<string> = [];
        let match = '';
        let bracketLevel = 0;
        let i;
        let found = false;
        let opened = false;
        for (i = 1; i < text.length; i++) {
            let prev = text[i - 1];
            let char = text[i];

            if (prev === '(' && !found) {
                match += prev;
                opened = true;
            }
            if (prev === ')' && opened && matches.length == 0) {
                matches.push(match);
                match = '';
                found = true;
                opened = false;
            }

            //to prevent finding parenthesis in the middle of the text
            if (!opened && !found) {
                if (!char.match(this.trailingregex)) {
                    break;
                }
            }

            if (opened && !char.match(this.nameregex)) {
                opened = false;
                break;
            }

            if (found && char === "{") {
                if (bracketLevel == 0) {
                    matches.push(match);
                    match = '';
                }
                bracketLevel++;
            }

            if (found && prev === "}") {
                bracketLevel--;
                if (bracketLevel == 0) {
                    matches.push(match);
                    match = '';
                }
            }

            match += char;

        }
        if (found) {
            matches.push(match);
        }
        return {
            matches: matches,
            rest: ''
        };
    }

    tryParse(text: string, options?: ExprParserOptions): ParseResult {
        if (options && options.debugInfo) {
            console.log('Try to match a paranthesed template expr' + text);
        }
        let result = this.match(text);
        if (result.matches.length > 0) {
            let rest = result.rest;
            if (options && options.debugInfo) {
                console.log('Found a parenthesed template expr');
                console.log('text: ' + text);
                console.log(`Found parenthesed template:${result.matches[0]}`);
                console.log(`rest:${rest}`);
            }
            return {
                parsed: result.matches,
                rest: rest
            };
        }
        return undefined;
    }
}

//{{znaczenia}}\n''rzeczownik, rodzaj żeński''\n: (1.1) {{ekon}} {{hand}} [[cena]]\n: (1.2) [[wartość]]\n: (1.3) [[nagroda]]\n
class OutsideTemplateParser implements ExprParser {

    private splitregex = XRegExp(`:`);
    private skipleadingregex = XRegExp(`[ ,{]`);

    private match(text: string): { matches: string[], rest: string } {
        const matches: Array<string> = [];
        let match = '';
        let bracketLevel = 0;
        let i;
        for (i = 1; i < text.length; i++) {
            let prev = text[i - 1];
            let char = text[i];
            if (prev === '{' && char === '{') {
                if (bracketLevel === 0 && i == 1) {
                    match += prev;
                }
                bracketLevel++;
            }
            if (prev === '}' && char === '}') {
                bracketLevel--;
                if (bracketLevel === 0) {
                    match += char;

                    //only first closed template can be name of an outside template
                    if (matches.length == 0) {

                        match = match.trim().replace(/^{{/g, '').replace(/}}$/g, '');
                        matches.push(match);
                        match = ''
                    }
                    continue;
                }
            }

            if (bracketLevel > 0) {
                match += char;
            } else
                //trying to find outside template
                if (matches.length > 0) {
                    if (bracketLevel === 0 && prev === '\n' && char === '{') {
                        if (matches.length > 1) {
                            matches.push(match);
                            match = '';
                        }
                        break;
                    }
                    if (char === ':' && prev === '\n') {
                        matches.push(match);
                        match = '';
                    } else {
                        match += char;
                    }
                } else
                    if (!char.match(this.skipleadingregex)) {
                        break;
                    }
        }
        if (matches.length > 1 && match !== '') {
            matches.push(match);
        }
        //return outside template only when there are more matches after templete name
        return {
            matches: matches.length > 1 ? matches : [],
            rest: matches.length > 1 ? text.slice(i) : ''
        };
    }

    tryParse(text: string, options?: ExprParserOptions): ParseResult {
        if (options && options.debugInfo) {
            console.log('Try to match an outside template expr' + text);
        }
        let result = this.match(text);
        if (result.matches.length > 0) {
            let rest = result.rest;
            if (options && options.debugInfo) {
                console.log('Found an outside template expr');
                console.log('text: ' + text);
                console.log(`Found outside template:${result.matches[0]}`);
                console.log(`rest:${rest}`);
            }
            return {
                parsed: result.matches,
                rest: result.rest
            };
        }
        return undefined;
    }
}
class TemplateParser implements ExprParser {
    // \{\} in [] because we want to match last pair of }}, + has to work as greedy operator
    private templateregex = XRegExp(`^\{\{[${RegExes.letterregex} -|\.\n\{\}„“]+\}\}`);
    private templatesplitregex = XRegExp(`\\|(?![${RegExes.letterregex}|]+\})`);
    private skipleadingregex = XRegExp(`[ ,{]`);

    private match(text: string): { match: string, rest: string } {
        let match = '';
        let bracketLevel = 0;
        let i;
        for (i = 1; i < text.length; i++) {
            let prev = text[i - 1];
            let char = text[i];
            if (prev === '{' && char === '{') {
                if (bracketLevel === 0) {
                    match += prev;
                }
                bracketLevel++;
            }
            if (prev === '}' && char === '}') {
                bracketLevel--;
                if (bracketLevel === 0) {
                    match += char;
                    break;
                }
            }
            if (bracketLevel > 0) {
                match += char;
            } else if (!char.match(this.skipleadingregex)) {
                break;
            }
        }
        return {
            match: match,
            rest: match ? text.slice(i + 1) : ''
        };
    }

    tryParse(text: string, options?: ExprParserOptions): ParseResult {
        if (options && options.debugInfo) {
            console.log('Try to match a template expr' + text);
        }
        let result = this.match(text);
        // let match = text.match(this.templateregex);
        if (result.match) {
            let tosplit = result.match.trim().replace(/^{{/g, '').replace(/}}$/g, '');
            let rest = result.rest;
            if (options && options.debugInfo) {
                console.log('Found a template expr');
                console.log('text: ' + text);
                console.log(`Found template:${result.match}`);
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
    private forbiddenregex = XRegExp('[{}]');

    tryParse(text: string, options?: ExprParserOptions): ParseResult {
        let match = text.match(this.assignmentoutsideregex);
        if (match) {
            if (options && options.debugInfo) {
                console.log('Found an outside assignment expr');
                console.log('match[0]: ' + match[0]);
            }
            if (!match[0].match(this.forbiddenregex)) {
                // can't use text.split(/[:]/), it splits multiple times
                let i = text.indexOf(':');
                return {
                    parsed: [text.slice(0, i), text.slice(i + 1)]
                };
            }
        }
        return undefined;
    }
}

class AssignmentParser implements ExprParser {
    // TODO - can't use ^ in assignmentregex
    private assignmentregex = XRegExp(`^[ ${RegExes.letterregex}]+[=][${RegExes.letterregex} {}|\n]`);
    private forbiddenregex = XRegExp('[{}]');

    tryParse(text: string, options?: ExprParserOptions): ParseResult {
        let match = text.match(this.assignmentregex);
        if (match) {
            if (options && options.debugInfo) {
                console.log('Found an assignment expr');
                console.log('match[0]: ' + match[0]);
            }
            // can't use match[0] because it could begin in the middle of text
            let splited = text.split(/[=]/g);
            if (!splited[0].match(this.forbiddenregex)) {
                if (options && options.debugInfo) {
                    console.log(`Assignment expr splitted 0:${splited[0]} 1:${splited[1]}`)
                }
                return {
                    parsed: splited
                };
            }
        }
        return undefined;
    }
}

class TextWithChildExprParser implements ExprParser {

    tryParse(text: string, options?: ExprParserOptions): ParseResult {
        const regex = options.splitLevel === 2 ? /(^|[\s])([\*\#]{2}|\#\*)[\s]/g : /(^|[\s])([\*\#]{3}|\#\*)[\s]/g;
        const splitted = text.split(regex);
        if (splitted.length > 1) {
            if (options && options.debugInfo) {
                console.log('Found an text with child expr');
            }
            splitted.unshift(WikiParser.TEXT_PROPERTY_NAME);
            return {
                parsed: splitted
            };
        }
        return undefined;
    }
}

class TextLineExprParser implements ExprParser {
    tryParse(text: string, options?: ExprParserOptions): ParseResult {
        const splitted = text.split('\n');
        if (splitted.length > 1) {
            if (options && options.debugInfo) {
                console.log(`Found a text line: ${splitted[0]}`);
            }
            return {
                parsed: [splitted[0]],
                rest: splitted.slice(1).join('\n'),
                isText: true
            };
        }
        return undefined;

    }

}

export class WikiParser {
    static TEXT_PROPERTY_NAME = '#text';
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
            this.setPropertyValue(currentObject, WikiParser.TEXT_PROPERTY_NAME, text);
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


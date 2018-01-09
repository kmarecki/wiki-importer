import * as XRegExp from 'xregexp';
import {ExprParser, ExprParserOptions, ParseResult, RegExes} from './exprParser';
export class TemplateParser implements ExprParser {
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
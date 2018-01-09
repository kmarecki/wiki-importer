import * as XRegExp from 'xregexp';
import {ExprParser, ExprParserOptions, ParseResult, RegExes} from './exprParser';

//(1.1) {{ekon}} {{hand}} [[cena]]
//(1.1-3) {{odmiana-rzeczownik-czeski|Mianownik lp    = cena|Mianownik lm   = ceny}}"
export class ParenthesedTemplateParser implements ExprParser {

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
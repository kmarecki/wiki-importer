import * as XRegExp from 'xregexp';
import {ExprParser, ExprParserOptions, ParseResult, RegExes} from './exprParser';

//{{znaczenia}}\n''rzeczownik, rodzaj żeński''\n: (1.1) {{ekon}} {{hand}} [[cena]]\n: (1.2) [[wartość]]\n: (1.3) [[nagroda]]\n
export class OutsideTemplateParser implements ExprParser {

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
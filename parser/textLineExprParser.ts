import * as XRegExp from 'xregexp';
import {ExprParser, ExprParserOptions, ParseResult, RegExes} from './exprParser';
export class TextLineExprParser implements ExprParser {
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

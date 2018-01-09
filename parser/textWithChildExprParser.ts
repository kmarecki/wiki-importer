import * as XRegExp from 'xregexp';
import {ExprParser, ExprParserOptions, ParseResult, RegExes, ParserConsts} from './exprParser';
export class TextWithChildExprParser implements ExprParser {

    tryParse(text: string, options?: ExprParserOptions): ParseResult {
        const regex = options.splitLevel === 2 ? /(^|[\s])([\*\#]{2}|\#\*)[\s]/g : /(^|[\s])([\*\#]{3}|\#\*)[\s]/g;
        const splitted = text.split(regex);
        if (splitted.length > 1) {
            if (options && options.debugInfo) {
                console.log('Found an text with child expr');
            }
            splitted.unshift(ParserConsts.TEXT_PROPERTY_NAME);
            return {
                parsed: splitted
            };
        }
        return undefined;
    }
}
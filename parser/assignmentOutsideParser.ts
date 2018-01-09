import * as XRegExp from 'xregexp';
import {ExprParser, ExprParserOptions, ParseResult, RegExes} from './exprParser';

export class AssignmentOutsideParser implements ExprParser {
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
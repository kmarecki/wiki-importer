import * as XRegExp from 'xregexp';
import {ExprParser, ExprParserOptions, ParseResult, RegExes} from './exprParser';
export class AssignmentParser implements ExprParser {
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
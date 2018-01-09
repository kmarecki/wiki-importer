import * as assert from 'assert';
import {WikiParser} from '../parser/wikiparser';

function parsePage(pageName: string, parser: WikiParser): void {
    let fileName = `./pages/${pageName}.json`;
    let page = <{ text: string, parsed: string }>require(fileName);
    let parsed = parser.parse(page.text);
    console.log(parsed);
    assert.deepEqual(parsed, page.parsed);
}

describe('WikiParser test suite', () => {
    let parser = new WikiParser();
    parser.debugInfo = false;
    parser.stripCategories = true;

    it('parse (delfin)', (done) => {
        parsePage('delfin', parser);
        done();
    });

    it('strip categories (dělat)', (done) => {
        parsePage('dělat', parser);
        done();
    });

    it('parse references (moří)', (done) => {
        parsePage('moří', parser);
        done();
    });

    it('parse lists (sova)', (done) => {
        parsePage('sova', parser);
        done();
    });

    it('parse template no line break (alarmieren)', (done) => {
        parsePage('alarmieren', parser);
        done();
    });

    it('parse (cena)', (done) => {
        parser.stripCategories = false;
        parsePage('cena', parser);
        done();
    });
});

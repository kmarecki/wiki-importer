/// <reference path="../typings/index.d.ts" />

import * as assert from 'assert';
import {WikiParser} from '../wikiparser';

function parsePage(pageName: string, parser: WikiParser): void {
    var fileName = `./pages/${pageName}.json`;
    var page = <{text: string, parsed: string}>require(fileName);
    assert.deepEqual(parser.parse(page.text), page.parsed);
}

describe('WikiParser test suite', () => {
    let parser = new WikiParser();
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
});
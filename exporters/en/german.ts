import * as _ from 'lodash'
import {WikiExporter, LexemExport} from '../../wikiexporter';

import {GrammarPart} from '../../grammar/meta';
import {Lexem, LexemTranslation} from '../../grammar/lexem';

export class EnglishGermanExporter implements WikiExporter {
    export(title: string, parsed: any): LexemExport {
        let lemma = title;
        let part = this.findPart(parsed);
        let lexem: Lexem = {
            lemma: lemma,
            part: part
        };
        let meaning = this.findMeaning(parsed, part);
        let translation: LexemTranslation = {
            lexem: lemma,
            part: part,
            lang: 'en',
            meanings: [
                { meaning: meaning }
            ]
        };
        let result: LexemExport = {
            lexem: lexem,
            translation: translation
        }
        return result;
    }

    private findPart(parsed: any): GrammarPart {
        let german = parsed.German;
        if (german) {
            if (german.Adjective) {
                return GrammarPart.Adjective;
            }
            if (german.Adverb) {
                return GrammarPart.Adverb;
            }
            if (german.Noun) {
                return GrammarPart.Noun;
            }
            if (german.Verb) {
                return GrammarPart.Verb;
            }
        }
        return undefined;
    } 

    private findMeaning(parsed: any, part: GrammarPart): string {
        let german = parsed.German;
        if (german) {
            switch(part){
                case GrammarPart.Adjective: {
                    return german.Adjective['#text'];
                }
                case GrammarPart.Adverb: {
                    return german.Adverb['#text'];
                }
                case GrammarPart.Noun: {
                    return german.Noun['#text'];
                }
                case GrammarPart.Verb: {
                    return german.Verb['#text'];
                }
            }
        }
        return undefined;
    }
}
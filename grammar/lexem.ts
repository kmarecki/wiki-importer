import {GrammarPart} from './meta';

export interface LexemMeaning {
    meaning: string;
    example?: string;
}

export interface LexemTranslation {
    lexem: string;
    part: GrammarPart;
    lang: string;
    meanings: LexemMeaning[];
}

export interface Lexem {
    lemma: string;
    part: GrammarPart;
}
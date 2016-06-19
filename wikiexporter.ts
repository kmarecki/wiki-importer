import {Lexem, LexemTranslation} from './grammar/lexem';

export interface LexemExport {
    lexem: Lexem;
    translation: LexemTranslation;
}

export interface WikiExporter {
    export(title: string, parsed: any): LexemExport;
}

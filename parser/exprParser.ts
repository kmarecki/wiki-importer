export class RegExes {
    static letterregex = '\\pL\\p{Cyrillic}\\p{Hebrew}\u0301\\p{M}';
}

export interface ParseResult {
    parsed: string[];
    rest?: string;
    isText?: boolean;
}

export interface ExprParserOptions {
    debugInfo: boolean;
    stripCategories: boolean;
    splitLevel: number;
}

export interface ExprParser {
    tryParse(text: string, options?: ExprParserOptions): ParseResult;
}

export class ParserConsts {
    static TEXT_PROPERTY_NAME = '#text';
}

    export interface Adapter {
        
        getLanguageMatch(): RegExp;

        getEntryLanguage(language: string): string;
    }

    export class BaseAdapter implements Adapter {
        getEntryLanguage(lang: string): string {
            return lang;
        }

        getLanguageMatch(): RegExp {
            return /^==[^=\|[\n\r\t.,'\"\+!?]+==/g;
        }
    }
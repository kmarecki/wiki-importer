    export interface Adapter {
        getEntryLanguage(language: string): string;
    }

    export class BaseAdapter implements Adapter {
        public getEntryLanguage(lang: string): string {
            return lang;
        }
    }
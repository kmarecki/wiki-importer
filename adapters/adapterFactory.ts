import * as XRegExp from 'xregexp';
import { Adapter, BaseAdapter } from './adapter';

class DEWiktionaryAdapter extends BaseAdapter {

    public getEntryLanguage(lang: string): string {
        var regex = XRegExp(`\{\{|\\||\}\}`);
        return lang.split(regex)[2];
    }

    public getLanguageMatch(): RegExp {
        return /^==[^=[\n\r\t.,'\"\+!?]+==/g;
    }
}

class PLWiktionaryAdapter extends BaseAdapter {

    public getEntryLanguage(lang: string): string {
        var regex = XRegExp(`\{\{|\}\}`);
        return lang.split(regex)[1];
    }
}

export class AdapterFactory {
    static createAdapter(name: string): Adapter {
        if (name) {
            switch (name) {
                case 'dewiktionary': return new DEWiktionaryAdapter();
                case 'plwiktionary': return new PLWiktionaryAdapter();
                default: throw new Error(`${name} is unknown wikimeta adapter.`);
            }
        } 
        return new BaseAdapter();
    }
}

import * as XRegExp from 'xregexp';
import { BaseAdapter } from './adapter';

export class PLWiktionaryAdapter extends BaseAdapter {

    public getEntryLanguage(lang: string): string {
        var regex = XRegExp(`\{\{|\}\}`);
        return lang.split(regex)[1];
    }
}
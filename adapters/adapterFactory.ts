import { Adapter } from './adapter';
import { PLWiktionaryAdapter } from './plwiktionary';

export class AdapterFactory {
    static createAdapter(name: string): Adapter {
        switch (name) {
            case 'plwiktionary': return new PLWiktionaryAdapter();
            default: throw new Error(`${name} is unknown wikimeta adapter.`);
        }
    }
}

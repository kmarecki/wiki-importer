import { Adapter } from '../adapters/adapter';
import { AdapterFactory } from '../adapters/adapterFactory';
import { Page, TextPart} from './parts';
export class PageSplitter {

    splitH2(adapter:Adapter, text: string): TextPart[] {
        const parts: TextPart[] = [];
        let currentPart: TextPart;
        const langregex = adapter.getLanguageMatch(); 
        for (var line of text.split('\n')) {
            if (line.match(langregex)) {
                if (currentPart != null) {
                    parts.push(currentPart);
                }
                currentPart = new TextPart();
                currentPart.value = line.replace(/=/g, '').trim();
                currentPart.text = line;
            } else {
                if (currentPart != null) {
                    currentPart.text = currentPart.text + '\n' + line;
                }
            }
        }
        if (currentPart != null) {
            parts.push(currentPart);
        }
        return parts;
    }
}
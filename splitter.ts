import * as sax from 'sax';
import * as fs from 'fs';

export class Splitter {
    private currentTag: sax.Tag;

    split(xmlPath: string, outputDir: string): void {
        var parser = sax.createStream(true, {});
        var tagCount = 1;
        parser.on('error', e => {
            console.error('error!', e);
        });
        parser.on('opentag', tag => {
            this.currentTag = tag;
        });
        parser.on('text', t => {
            t = t.trim();
            if (t && this.currentTag.name == 'title') {
                console.info(`${tagCount++} ${t}`);
            }
        })

        fs.createReadStream(xmlPath).pipe(parser);
    }
}

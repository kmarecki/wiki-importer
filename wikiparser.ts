/// <reference path="typings/index.d.ts" />
import * as _ from 'lodash';
import * as XRegExp from 'xregexp';

class WikiParser {

    private h1regex = XRegExp('=[ \\pL]+=');
    private h2regex = XRegExp('==[ \\pL]+==');
    private h3regex = XRegExp('===[ \\pL]+===');
    private h4regex = XRegExp('====[ \\pL]+====');
    private splitregex = XRegExp('[\*\#]');
    private templateregex = XRegExp('\{\{[^\[\n\r\t\'\"\+!?]+\}\}');
    private templatesplitregex = XRegExp('\\|(?![\\pL\\p{Hebrew}|]+\})');

    private objects: Object[];
    private currentLevel = 0;
    private currentText: string = '';

    private get currentObject(): Object {
        return _.last(this.objects);
    }

    private get rootObject(): Object {
        return _.first(this.objects);
    }


    private matchHeader(line: string): number {

        if (this.h4regex.test(line)) {
            return 4;
        }
        if (this.h3regex.test(line)) {
            return 3;
        }
        if (this.h2regex.test(line)) {
            return 2;
        }
        if (this.h1regex.test(line)) {
            return 1;
        }

        return -1;
    }

    private getHeaderValue(header: string): string {
        return header.replace(/=/g, '').trim();
    }

    private tryParseTemplate(template: string): string[] {
        if (template) {
            template = template.trim();
            if (template.match(this.templateregex)) {
                template = template.trim().replace(/^{{/g, '').replace(/}}$/g, '');
                // return template.split(this.templatesplitregex);
                return template.split(this.templatesplitregex);
                
            }
            return null;
        }
    }

    private saveCurrentText(): void {
        if (this.currentText) {
            var splitted = this.currentText.split(this.splitregex);
            for (var splittedPart of splitted) {
                if (splittedPart) {
                    var parsed = this.tryParseTemplate(splittedPart);
                    if (parsed) {
                        var parsedTemplate = {}
                        parsedTemplate[parsed[0]] = parsed.slice(1);
                        (<Object[]>this.currentObject).push(parsedTemplate);
                    } else {
                        (<Object[]>this.currentObject).push(splittedPart);
                    }
                }
            }
            this.currentText = '';
        }
    }

    private addNewHeader(value: string): void {
        var newHeader = {};
        newHeader[value] = [];
        (<Object[]>this.currentObject).push(newHeader);
        this.objects.push(_.last(<Object[]>this.currentObject)[value]);
    }

    parse(text: string): any {

        this.objects = [[]];
        for (var line of text.split('\n')) {
            var level = this.matchHeader(line);
            if (level > 0) {
                var headerValue = this.getHeaderValue(line);
                console.log(level + ' ' + headerValue);

                this.saveCurrentText();

                if (level > this.currentLevel) {
                    //Add child header
                    this.saveCurrentText();
                    this.addNewHeader(headerValue);
                } else {
                    //Save header value, return to parent header
                    this.saveCurrentText();
                    for (let i = 0; i <= this.currentLevel - level; i++) {
                        this.objects.pop();
                    }
                    this.addNewHeader(headerValue);
                }
                this.currentLevel = level;
            } else {
                this.currentText = this.currentText + line;
            }
        }
        return this.rootObject;
    }
}

var text = "== čeština ==\n=== výslovnost ===\n* {{IPA|maːslɔ}}\n* {{Audio|Cs-máslo.ogg|máslo}}\n\n=== dělení ===\n* más-lo\n\n=== podstatné jméno ===\n* ''rod střední''\n\n==== skloňování ====\n{{Substantivum (cs)\n  | snom = máslo\n  | sgen = másla\n  | sdat = máslu\n  | sacc = máslo\n  | svoc = máslo\n  | sloc = máslu\n  | sins = máslem\n  | pnom = másla\n  | pgen = másel\n  | pdat = máslům\n  | pacc = másla\n  | pvoc = másla\n  | ploc = máslech\n  | pins = másly\n}}\n\n==== význam ====\n# [[jedlý]] [[živočišný]] [[tuk]] [[vyráběný]] [[stloukání]]m [[smetana|smetany]]\n#* {{Příklad|cs|Měla ráda chleba s máslem.}}\n\n==== překlady ====\n# {{Překlady\n  | význam = jedlý tuk\n  | da = {{P|da|smør}}\n  | de = {{P|de|Butter|f}}\n  | el = {{P|el|βούτυρο|n}}\n  | en = {{P|en|butter}}\n  | eo = {{P|eo|butero}}\n  | es = {{P|es|mantequilla|f}}\n  | fi = {{P|fi|voi}}\n  | fr = {{P|fr|beurre|m}}\n  | ga = {{P|ga|im|m}}\n  | he = {{P|he|חֶמְאָה|f}}\n  | hsb = {{P|hsb|butra|f}}\n  | hu = {{P|hu|vaj}}\n  | it = {{P|it|burro|m}}\n  | lv = {{P|lv|sviests|m}}\n  | no = {{P|no|smør}}\n  | pl = {{P|pl|masło|n}}\n  | ru = {{P|ru|масло|n}}\n  | sk = {{P|sk|maslo|n}}\n  | tr = {{P|tr|tereyağı}}\n  | yi = {{P|yi|פּוטער|f}}\n}}\n\n==== související ====\n* [[máslový]]\n* [[máslovitý]]\n* [[máselný]]\n* [[máslíčko]]\n* [[máslovka]]\n* [[máselnice]]\n* [[máslař]]\n* [[máslařka]]\n* [[máslenka]]\n* [[máslovník]]\n* [[máslárna]]\n\n==== slovní spojení ====\n* [[kobylí máslo]]\n* [[pomazánkové máslo]]\n* [[zaječí máslo]]\n\n==== fráze a idiomy ====\n* [[mít máslo na hlavě]]\n* [[jít jako po másle]]\n";


var parser = new WikiParser();
var parsed = parser.parse(text);
//var parsed = wtf_wikipedia.parse(text);
console.log(JSON.stringify(parsed, null, 4));

var unicodeWord = XRegExp('^\\pL+$'); // L: Letter
console.log(unicodeWord.test("Русский")); // true
console.log(unicodeWord.test("日本語")); // true
console.log(unicodeWord.test("العربية")); // true

console.log(XRegExp("^\\p{Katakana}+$").test("カタカナ")); // true
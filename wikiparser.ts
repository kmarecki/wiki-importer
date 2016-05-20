/// <reference path="typings/index.d.ts" />
import * as _ from 'lodash';
import * as XRegExp from 'xregexp';

export class WikiParser {
    TEXT_PROPERTY_NAME = '#text';
    private letterregex = '\\pL\\p{Hebrew}'; v
    private h1regex = XRegExp(`=[ ${this.letterregex}]+=`);
    private h2regex = XRegExp(`==[ ${this.letterregex}]+==`);
    private h3regex = XRegExp(`===[ ${this.letterregex}]+===`);
    private h4regex = XRegExp(`====[ ${this.letterregex}]+====`);
    private splitregex = XRegExp('[\*\#]+');
    private templateregex = XRegExp(`^\{\{[${this.letterregex} -|\.]+\}\}`);
    private templatesplitregex = XRegExp(`\\|(?![${this.letterregex}|]+\})`);
    private assignmentregex = XRegExp(`[${this.letterregex} ]+=[${this.letterregex} {}|\n]+`);

    private objects: Object[];
    private currentLevel: number;
    private currentText: string = '';

    private reset(): void {
        this.objects = [{}];
        this.currentLevel = 0;
        this.currentText = '';
    }
    
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

    private tryParseTemplate(text: string): string[] {
        if (text.match(this.templateregex)) {
            text = text.trim().replace(/^{{/g, '').replace(/}}$/g, '');
            return text.split(this.templatesplitregex);
        }
        return null;
    }

    private tryParseAssignment(text: string): string[] {
        if (text.match(this.assignmentregex)) {
            return text.split('=');
        }
        return null;
    }

    private addPropertyFromParseResult(parsed: string[], currentObject: Object): void {
        var propertyName = parsed[0].trim();
        var childs = parsed.slice(1);
        this.addProperty(propertyName, childs, currentObject);
    }

    private addProperty(propertyName: string, childs: string[], currentObject: Object): void {
        currentObject[propertyName] = {};
        if (childs) {
            for (var child of childs) {
                this.tryParseText(child, currentObject[propertyName]);
            }
        }
    }

    private addTextProperty(text: string, currentObject: Object): void {
       
        if (!currentObject[this.TEXT_PROPERTY_NAME]) {
            currentObject[this.TEXT_PROPERTY_NAME] = text;
        } else {
            if(!(currentObject[this.TEXT_PROPERTY_NAME] instanceof Array)) {
                currentObject[this.TEXT_PROPERTY_NAME] = [currentObject[this.TEXT_PROPERTY_NAME]];
            }
            (<[]>currentObject[this.TEXT_PROPERTY_NAME]).push(text);
        }
    }

    private tryParseText(text: string, currentObject: Object): void {
        if (text) {
            text = text.trim();
            var parsed = this.tryParseTemplate(text);
            if (parsed) {
                this.addPropertyFromParseResult(parsed, currentObject);
            } else {
                parsed = this.tryParseAssignment(text);
                if (parsed) {
                    this.addPropertyFromParseResult(parsed, currentObject);
                } else {
                    this.addTextProperty(text, currentObject);
                }
            }
        }
    }

    private saveCurrentText(): void {
        if (this.currentText) {
            var splitted = this.currentText.split(this.splitregex);
            for (var splittedPart of splitted) {
                this.tryParseText(splittedPart, this.currentObject);
            }
            this.currentText = '';
        }
    }

    private addNewHeader(value: string): void {
        this.addProperty(value, null, this.currentObject);
        this.objects.push(this.currentObject[value]);
    }

    parse(text: string): any {
        if (text) {
        this.reset();
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
        this.saveCurrentText();
        return this.rootObject;
    }
    }
}

// var text = "== čeština ==\n=== výslovnost ===\n* {{IPA|maːslɔ}}\n* {{Audio|Cs-máslo.ogg|máslo}}\n\n=== dělení ===\n* más-lo\n\n=== podstatné jméno ===\n* ''rod střední''\n\n==== skloňování ====\n{{Substantivum (cs)\n  | snom = máslo\n  | sgen = másla\n  | sdat = máslu\n  | sacc = máslo\n  | svoc = máslo\n  | sloc = máslu\n  | sins = máslem\n  | pnom = másla\n  | pgen = másel\n  | pdat = máslům\n  | pacc = másla\n  | pvoc = másla\n  | ploc = máslech\n  | pins = másly\n}}\n\n==== význam ====\n# [[jedlý]] [[živočišný]] [[tuk]] [[vyráběný]] [[stloukání]]m [[smetana|smetany]]\n#* {{Příklad|cs|Měla ráda chleba s máslem.}}\n\n==== překlady ====\n# {{Překlady\n  | význam = jedlý tuk\n  | da = {{P|da|smør}}\n  | de = {{P|de|Butter|f}}\n  | el = {{P|el|βούτυρο|n}}\n  | en = {{P|en|butter}}\n  | eo = {{P|eo|butero}}\n  | es = {{P|es|mantequilla|f}}\n  | fi = {{P|fi|voi}}\n  | fr = {{P|fr|beurre|m}}\n  | ga = {{P|ga|im|m}}\n  | he = {{P|he|חֶמְאָה|f}}\n  | hsb = {{P|hsb|butra|f}}\n  | hu = {{P|hu|vaj}}\n  | it = {{P|it|burro|m}}\n  | lv = {{P|lv|sviests|m}}\n  | no = {{P|no|smør}}\n  | pl = {{P|pl|masło|n}}\n  | ru = {{P|ru|масло|n}}\n  | sk = {{P|sk|maslo|n}}\n  | tr = {{P|tr|tereyağı}}\n  | yi = {{P|yi|פּוטער|f}}\n}}\n\n==== související ====\n* [[máslový]]\n* [[máslovitý]]\n* [[máselný]]\n* [[máslíčko]]\n* [[máslovka]]\n* [[máselnice]]\n* [[máslař]]\n* [[máslařka]]\n* [[máslenka]]\n* [[máslovník]]\n* [[máslárna]]\n\n==== slovní spojení ====\n* [[kobylí máslo]]\n* [[pomazánkové máslo]]\n* [[zaječí máslo]]\n\n==== fráze a idiomy ====\n* [[mít máslo na hlavě]]\n* [[jít jako po másle]]\n";


// var parser = new WikiParser();
// var parsed = parser.parse(text);
// //var parsed = wtf_wikipedia.parse(text);
// console.log(JSON.stringify(parsed, null, 4));

import {
    workspace, WorkspaceConfiguration, FormattingOptions
} from 'vscode';

export class Format {

    protected static spacePlaceholderStr = '__VSCODE__SPACE__PLACEHOLDER__';
    protected static depth: number = 0;
    protected static options: FormattingOptions;
    protected static source: string;
    protected static langId: string;
    protected static offset: number = 0;
    protected static prev: string = '';
    protected static next: string = '';
    protected static space;
    protected static newLine;

    public static document(source: string, formattingOptions: FormattingOptions, languageId: string): string {
        var config: WorkspaceConfiguration = workspace.getConfiguration('format');
        this.options = formattingOptions;
        this.source = source;
        this.langId = languageId;

        // Config base
        var space = config.get<any>('space');
        var newLine = config.get<any>('newLine');

        this.space = space;
        this.newLine = newLine;

        var spaceOther = space.language[languageId];

        var braceSpaceOpenBefore = space.brace.open.before;
        var braceNewLine = newLine.brace;

        var parenSpaceOpenBefore = space.parenthesis.open.before;
        var parenSpaceOpenAfter = space.parenthesis.open.after;
        var parenSpaceCloseBefore = space.parenthesis.close.before;


        // Comma configs
        var commaSpaceBefore = config.get<number>('space.comma.before', 1);
        var commaSpaceAfter = config.get<number>('space.comma.after', 1);
        // Greater than
        var gtSpaceAfter = config.get<number>('space.greaterThan.after', 1);
        var gtSpaceBefore = config.get<number>('space.greaterThan.before', 1);
        // Less than
        var ltSpaceAfter = config.get<number>('space.lessThan.after', 1);
        var ltSpaceBefore = config.get<number>('space.lessThan.before', 1);
        // Equal sign
        var equalSpaceAfter = config.get<number>('space.equal.after', 1);
        var equalSpaceBefore = config.get<number>('space.equal.before', 1);
        // Not sign
        var notSpaceAfter = config.get<number>('space.not.after', 1);
        var notSpaceBefore = config.get<number>('space.not.before', 1);
        // Question sign
        var questionSpaceAfter = config.get<number>('space.question.after', 1);
        var questionSpaceBefore = config.get<number>('space.question.before', 1);
        // Colon sign
        var colonSpaceAfter = config.get<number>('space.colon.after', 1);
        var colonSpaceBefore = config.get<number>('space.colon.before', 1);

        var s: string = '';

        var ignoreSpace = false;
        var lastKeyword = '';

        var inString: boolean = false;
        var inComment: boolean = false;

        var stringChar = null;

        for (var i = 0; i < source.length; i++) {
            this.offset = i;
            var char: string = source[i];
            var next: string = source[i + 1];
            var prev: string = source[i - 1];
            this.next = next;
            this.prev = prev;
            var words: string[] = this.cleanArray(s.split(/[\s\(\)\[\];|'"]/));
            var last = words[words.length - 1];
            if ((inString || inComment) && char != '\'' && char != '"') {
                s += char;
                continue;
            }
            switch (char) {
                case '"':
                case '\'':
                    if (stringChar == char && inString) {
                        inString = false;
                        stringChar = null;
                    } else if (stringChar === null && !inString) {
                        inString = true;
                        stringChar = char;
                    }
                    s += char;
                    break;
                case '{':
                    if (inString || inComment) {
                        s += char;
                        break;
                    }
                    this.depth++;
                    ignoreSpace = true;
                    if (!braceNewLine) {
                        let c = 0;
                        for (let j in braceSpaceOpenBefore) {
                            if (lastKeyword == j) {
                                s = s.trim();
                                s += this.spacePlaceholder(braceSpaceOpenBefore[j]);
                                s = s.trim();
                                c++;
                                break;
                            }
                        }
                        if (c == 0) {
                            s = s.trim();
                            s += this.spacePlaceholder(braceSpaceOpenBefore.other);
                            s = s.trim();
                        }
                    } else {
                        var lineStr: string = this.lineAtIndex(s, s.length).trim();
                        if (lineStr != '') {
                            s += '\n' + this.indent(this.depth - 1);
                        }
                    }
                    s += char;
                    break;
                case '}':
                    if (inString || inComment) {
                        s += char;
                        break;
                    }
                    ignoreSpace = true;
                    this.depth--;
                    s += char;
                    break;
                case '(':
                    if (inString) {
                        s += char;
                        break;
                    }
                    ignoreSpace = true;
                    for (let j in parenSpaceOpenBefore) {
                        if (last == j) {
                            s = s.trim();
                            s += this.spacePlaceholder(parenSpaceOpenBefore[j]);
                            s = s.trim();
                            lastKeyword = last;
                            break;
                        }
                    }
                    s += char;
                    for (let j in parenSpaceOpenAfter) {
                        if (last == j) {
                            s = s.trim();
                            s += this.spacePlaceholder(parenSpaceOpenAfter[j]);
                            s = s.trim();
                            break;
                        }
                    }
                    break;
                case ')':
                    if (inString || inComment) {
                        s += char;
                        break;
                    }
                    ignoreSpace = true;
                    for (let j in parenSpaceCloseBefore) {
                        if (lastKeyword == j) {
                            s = s.trim();
                            s += this.spacePlaceholder(parenSpaceCloseBefore[j]);
                            s = s.trim();
                            break;
                        }
                    }
                    s += char;
                    break;
                case ',':
                    if (inString || inComment) {
                        s += char;
                        break;
                    }
                    ignoreSpace = true;
                    s = this.formatItem(char, s, commaSpaceBefore, commaSpaceAfter);
                    break;
                case '?':
                    if (inString || inComment) {
                        s += char;
                        break;
                    }
                    ignoreSpace = true;
                    s = this.formatOperator(char, s, questionSpaceBefore, questionSpaceAfter);
                    break;
                case ':':
                    if (inString || inComment) {
                        s += char;
                        break;
                    }
                    ignoreSpace = true;
                    s = this.formatItem(char, s, colonSpaceBefore, colonSpaceAfter);
                    break;
                case '>':
                    if (inString || inComment) {
                        s += char;
                        break;
                    }
                    ignoreSpace = true;
                    s = this.formatOperator(char, s, gtSpaceBefore, gtSpaceAfter);
                    break;
                case '<':
                    if (inString || inComment) {
                        s += char;
                        break;
                    }
                    ignoreSpace = true;
                    s = this.formatOperator(char, s, ltSpaceBefore, ltSpaceAfter);
                    break;
                case '=':
                    if (inString || inComment) {
                        s += char;
                        break;
                    }
                    ignoreSpace = true;
                    s = this.formatOperator(char, s, equalSpaceBefore, equalSpaceAfter);
                    break;
                case '!':
                    if (inString || inComment) {
                        s += char;
                        break;
                    }
                    ignoreSpace = true;
                    s = this.formatOperator(char, s, notSpaceBefore, notSpaceAfter);
                    break;
                default:
                    if (spaceOther && char in spaceOther) {
                        if (inString || inComment) {
                            s += char;
                            break;
                        }
                        ignoreSpace = true;
                        s = this.formatItem(char, s, (spaceOther[char].before || 0), (spaceOther[char].after || 0));
                    } else {
                        if (inString || inComment) {
                            s += char;
                            break;
                        }
                        if (ignoreSpace && char == ' ') {
                            // Skip
                        } else {
                            s += char;
                            ignoreSpace = false;
                        }
                    }
                    break;
            }
        }

        // if (braceSameline) {
        // 	s = s.replace(/\s*\{/g, spacePlaceholderStr.repeat(braceSpaceBefore) + '{');
        // }
        // s = s.replace(/,\s*/g, ',' + spacePlaceholderStr.repeat(commaSpaceAfter));

        s = s.replace(new RegExp(Format.spacePlaceholderStr, 'g'), ' ');

        // if (!braceSameline) {
        // 	var lines = s.split(/\n/);
        // 	var i = 0;
        // 	lines.forEach(line => {
        // 		line = lines[i].trim();
        // 		if (line.match(/\{$/)) {
        // 			lines[i] = line.replace(/\{$/, '\n{');
        // 		}
        // 		i++;
        // 	});
        // 	s = lines.join('\n');
        // }

        return s;
    }

    protected static languageOverride(char: string): { before: number, after: number } {
        if (this.space.language[this.langId][char]) {
            return this.space.language[this.langId][char]
        }
        return null;
    }

    protected static formatItem(char: string, s: string, spaceBefore: number, spaceAfter: number): string {
        var override = this.languageOverride(char);
        if (override) {
            spaceBefore = override.before;
            spaceAfter = override.after;
        }
        s = s.trim();
        s += Format.spacePlaceholderStr.repeat(spaceBefore);
        s += char;
        s += Format.spacePlaceholderStr.repeat(spaceAfter);
        return s.trim();
    }

    protected static formatOperator(char: string, s: string, spaceBefore: number, spaceAfter: number): string {
        var override = this.languageOverride(char);
        if (override) {
            spaceBefore = override.before;
            spaceAfter = override.after;
        }
        s = s.trim();
        if (this.prev && this.notBefore(this.prev, '=', '!', '>', '<', '?', '%')) {
            s += Format.spacePlaceholderStr.repeat(spaceBefore);
        }
        s = s.trim();
        s += char;
        s = s.trim();
        if (this.next && this.notAfter(this.next, '=', '>', '<', '?', '%')) {
            if (char != '?' || this.source.substr(this.offset, 4) != '?php') {
                s += Format.spacePlaceholderStr.repeat(spaceAfter);
            }
        }
        return s.trim();
    }

    protected static notBefore(prev: string, ...char: string[]): boolean {
        for (var c in char) {
            if (char[c] == prev) {
                return false;
            }
        }
        return true;
    }

    protected static notAfter(next: string, ...char: string[]): boolean {
        for (var c in char) {
            if (char[c] == next) {
                return false;
            }
        }
        return true;
    }

    protected static cleanArray(arr: string[]): string[] {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] == '') {
                arr.splice(i, 1);
                i--;
            }
        }
        return arr;
    }

    protected static spacePlaceholder(length: number): string {
        return Format.spacePlaceholderStr.repeat(length);
    }

    protected static lineAtIndex(str: string, idx: number): string {
        var first = str.substring(0, idx);
        var last = str.substring(idx);

        var firstNewLine = first.lastIndexOf("\n");
        var secondNewLine = last.indexOf("\n");

        if (secondNewLine == -1) {
            secondNewLine = last.length;
        }

        return str.substring(firstNewLine + 1, idx + secondNewLine);
    }

    protected static indent(amount: number) {
        amount = amount < 0 ? 0 : amount;
        return Format.spacePlaceholderStr.repeat(amount * 4);
        // var s = '';
        // for (var j = 0; j < depth; j++) s += ' ';
        // return s;
    }
}
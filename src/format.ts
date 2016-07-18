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
    protected static char;
    protected static last;
    protected static words: string[];

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

        var s: string = '';

        var ignoreSpace = false;
        var lastKeyword = '';

        var inString: boolean = false;
        var inComment: boolean = false;
        var commentType: CommentType = null;

        var stringChar = null;

        for (var i = 0; i < source.length; i++) {
            this.offset = i;
            this.char = source[i];
            this.next = source[i + 1];
            this.prev = source[i - 1];
            this.words = this.cleanArray(s.split(/[\s\(\)\[\];|'"\{\}]/));
            this.last = this.words[this.words.length - 1];

            var spaces = this.getSpaces(this.char);

            switch (this.char) {
                case '/':
                    // If we are not in a comment
                    if (!inComment && this.next == '/' || this.prev == '/') {
                        inComment = true;
                        commentType = CommentType.SingleLine;
                    } else if (!inComment && this.next == '*') {
                        inComment = true;
                        commentType = CommentType.MultiLine;
                    }
                    // If we are in a comment and it is multiline
                    else if (inComment && commentType == CommentType.MultiLine) {
                        inComment = false;
                        commentType = null;
                    }
                    s += this.char;
                    break;
                case '\n':
                    if (inComment && commentType == CommentType.SingleLine) {
                        inComment = false;
                        commentType = null;
                    }
                    s += this.char;
                    break;
                case '"':
                case '\'':
                    if (stringChar == this.char && inString) {
                        inString = false;
                        stringChar = null;
                    } else if (stringChar === null && !inString) {
                        inString = true;
                        stringChar = this.char;
                    }
                    s += this.char;
                    break;
                case '{':
                    if (inString || inComment) {
                        s += this.char;
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
                    s += this.char;
                    break;
                case '}':
                    if (inString || inComment) {
                        s += this.char;
                        break;
                    }
                    ignoreSpace = true;
                    this.depth--;
                    s += this.char;
                    break;
                case '(':
                    if (inString || inComment) {
                        s += this.char;
                        break;
                    }
                    ignoreSpace = true;
                    for (let j in parenSpaceOpenBefore) {
                        if (this.last == j) {
                            s = s.trim();
                            s += this.spacePlaceholder(parenSpaceOpenBefore[j]);
                            s = s.trim();
                            lastKeyword = this.last;
                            break;
                        }
                    }
                    s += this.char;
                    for (let j in parenSpaceOpenAfter) {
                        if (this.last == j) {
                            s = s.trim();
                            s += this.spacePlaceholder(parenSpaceOpenAfter[j]);
                            s = s.trim();
                            break;
                        }
                    }
                    break;
                case ')':
                    if (inString || inComment) {
                        s += this.char;
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
                    s += this.char;
                    break;
                case ',':
                case ':':
                case ';':
                    if (inString || inComment) {
                        s += this.char;
                        break;
                    }
                    ignoreSpace = true;
                    s = this.formatItem(this.char, s, spaces);
                    break;
                case '?':
                case '>':
                case '<':
                case '=':
                case '!':
                case '&':
                case '|':
                case '+':
                case '-':
                case '*':
                case '/':
                case '%':
                    if (inString || inComment) {
                        s += this.char;
                        break;
                    }
                    ignoreSpace = true;
                    s = this.formatOperator(this.char, s, spaces);
                    break;
                default:
                    if (spaceOther && this.char in spaceOther) {
                        if (inString || inComment) {
                            s += this.char;
                            break;
                        }
                        ignoreSpace = true;
                        s = this.formatItem(this.char, s, new Spaces((spaceOther[this.char].before || 0), (spaceOther[this.char].after || 0)));
                    } else {
                        if (inString || inComment) {
                            s += this.char;
                            break;
                        }
                        if (ignoreSpace && this.char == ' ') {
                            // Skip
                        } else {
                            s += this.char;
                            ignoreSpace = false;
                        }
                    }
                    break;
            }
        }

        s = s.replace(new RegExp(Format.spacePlaceholderStr, 'g'), ' ');

        return s;
    }

    protected static languageOverride(char: string): Spaces {
        if (this.space.language[this.langId] && this.space.language[this.langId][char]) {
            return this.space.language[this.langId][char]
        }
        return null;
    }

    protected static getSpaces(char: string): Spaces {
        var spaces: Spaces = new Spaces();
        var config: WorkspaceConfiguration = workspace.getConfiguration('format');
        switch (char) {
            case '&':
                spaces.before = config.get<number>('space.and.before', 1);
                spaces.after = config.get<number>('space.and.after', 1);
                break;
            case '|':
                spaces.before = config.get<number>('space.or.before', 1);
                spaces.after = config.get<number>('space.or.after', 1);
                break;
            case ',':
                spaces.before = config.get<number>('space.comma.before', 1);
                spaces.after = config.get<number>('space.comma.after', 1);
                break;
            case '>':
                spaces.before = config.get<number>('space.greaterThan.before', 1);
                spaces.after = config.get<number>('space.greaterThan.after', 1);
                break;
            case '<':
                spaces.before = config.get<number>('space.lessThan.before', 1);
                spaces.after = config.get<number>('space.lessThan.after', 1);
                break;
            case '=':
                spaces.before = config.get<number>('space.equal.before', 1);
                spaces.after = config.get<number>('space.equal.after', 1);
                break;
            case '!':
                spaces.before = config.get<number>('space.not.before', 1);
                spaces.after = config.get<number>('space.not.after', 1);
                break;
            case '=':
                spaces.before = config.get<number>('space.question.before', 1);
                spaces.after = config.get<number>('space.question.after', 1);
                break;
            case '=':
                spaces.before = config.get<number>('space.colon.before', 1);
                spaces.after = config.get<number>('space.colon.after', 1);
                break;
            case '-':
                if (this.next == '-' || this.prev == '-' || this.next.match(/\d/)) {
                    spaces.before = config.get<number>('space.increment.before', 0);
                    spaces.after = config.get<number>('space.increment.after', 0);
                } else {
                    spaces.before = config.get<number>('space.subtract.before', 1);
                    spaces.after = config.get<number>('space.subtract.after', 1);
                }
                break;
            case '+':
                if (this.next == '+' || this.prev == '+') {
                    spaces.before = config.get<number>('space.decrement.before', 0);
                    spaces.after = config.get<number>('space.decrement.after', 0);
                } else {
                    spaces.before = config.get<number>('space.add.before', 1);
                    spaces.after = config.get<number>('space.add.after', 1);
                }
                break;
            case ';':
                spaces.before = config.get<number>('space.semicolon.before', 1);
                spaces.after = config.get<number>('space.semicolon.after', 1);
                break;
            case '*':
                spaces.before = config.get<number>('space.multiply.before', 1);
                spaces.after = config.get<number>('space.multiply.after', 1);
                break;
            case '/':
                spaces.before = config.get<number>('space.divide.before', 1);
                spaces.after = config.get<number>('space.divide.after', 1);
                break;
            case '%':
                spaces.before = config.get<number>('space.modulo.before', 1);
                spaces.after = config.get<number>('space.modulo.after', 1);
                break;
        }
        return spaces;
    }

    protected static formatItem(char: string, s: string, spaces: Spaces): string {
        var override = this.languageOverride(char);
        if (override) {
            spaces = override;
        }
        s = s.trim();
        s += Format.spacePlaceholderStr.repeat(spaces.before);
        s += char;
        s += Format.spacePlaceholderStr.repeat(spaces.after);
        return s.trim();
    }

    protected static formatOperator(char: string, s: string, spaces: Spaces): string {
        var override = this.languageOverride(char);
        if (override) {
            spaces = override;
        }
        s = s.trim();
        if (this.prev && this.notBefore(this.prev, '=', '!', '>', '<', '?', '%', '&', '|', '/')) {
            s += Format.spacePlaceholderStr.repeat(spaces.before);
        }
        s = s.trim();
        s += char;
        s = s.trim();
        if (this.next && this.notAfter(this.next, '=', '>', '<', '?', '%', '&', '|', '/')) {
            if (char != '?' || this.source.substr(this.offset, 4) != '?php') {
                s += Format.spacePlaceholderStr.repeat(spaces.after);
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
    }
}

export enum CommentType { SingleLine, MultiLine }

export class Spaces {
    public before: number = 0;
    public after: number = 0;

    public constructor(before: number = 0, after: number = 0) {
        this.before = before;
        this.after = after;
    }
}
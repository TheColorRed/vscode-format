import {
	window, workspace, DocumentFormattingEditProvider, WorkspaceConfiguration,
	languages, ExtensionContext, TextEdit, Position, DocumentFilter,
	TextDocument, FormattingOptions, CancellationToken, Range, DocumentSelector
} from 'vscode';


class DocumentFormat implements DocumentFormattingEditProvider {

	private spacePlaceholderStr = '__VSCODE__SPACE__PLACEHOLDER__';

	private depth = 0;

	public provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions, token: CancellationToken): Thenable<TextEdit[]> {
		return this.format(document, null, options);
	}

	private format(document: TextDocument, range: Range, options): Thenable<TextEdit[]> {
		return new Promise(resolve => {
			let result: TextEdit[] = [];

			if (range === null) {
				var start = new Position(0, 0);
				var end = new Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
				range = new Range(start, end);
			}

			var source = document.getText();

			var newText: string = this.formatMe(source, document.languageId);

			result.push(new TextEdit(range, newText));

			return resolve(result);
		});

	}

	private formatMe(source: string, languageId: string): string {
		var config: WorkspaceConfiguration = workspace.getConfiguration('format');

		// Config base
		var space = config.get<any>('space');
		var newLine = config.get<any>('newLine');

		var spaceOther = space.language[languageId];

		var braceSpaceOpenBefore = space.brace.open.before;
		var braceNewLine = newLine.brace;

		var parenSpaceOpenBefore = space.parenthesis.open.before;
		var parenSpaceOpenAfter = space.parenthesis.open.after;
		var parenSpaceCloseBefore = space.parenthesis.close.before;


		// Comma configs
		var commaSpaceAfter = config.get<number>('space.comma.after', 1);

		var s: string = '';

		var ignoreSpace = false;
		var lastKeyword = '';

		var inString: boolean = false;
		var inComment: boolean = false;

		var stringChar = null;

		for (var i = 0; i < source.length; i++) {
			var char: string = source[i];
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
					} else if(stringChar === null && !inString) {
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
					if (!braceNewLine) {
						for (let j in braceSpaceOpenBefore) {
							if (lastKeyword == j) {
								s = s.trim();
								s += this.spacePlaceholder(braceSpaceOpenBefore[j]);
								s = s.trim();
								break;
							}
						}
					} else {
						if (this.lineAtIndex(s, i).trim() != '') {
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
					s = s.trim();
					s += char;
					s += this.spacePlaceholderStr.repeat(commaSpaceAfter);
					s = s.trim();
					break;
				default:
					if (char in spaceOther) {
						if (inString || inComment) {
							s += char;
							break;
						}
						ignoreSpace = true;
						s = s.trim();
						s += this.spacePlaceholder((spaceOther[char].before || 0));
						s = s.trim();
						s += char;
						s = s.trim();
						s += this.spacePlaceholder((spaceOther[char].after || 0));
						s = s.trim();
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
		// 	s = s.replace(/\s*\{/g, this.spacePlaceholderStr.repeat(braceSpaceBefore) + '{');
		// }
		// s = s.replace(/,\s*/g, ',' + this.spacePlaceholderStr.repeat(commaSpaceAfter));

		s = s.replace(new RegExp(this.spacePlaceholderStr, 'g'), ' ');

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

	protected cleanArray(arr: string[]): string[] {
		for (var i = 0; i < arr.length; i++) {
			if (arr[i] == '') {
				arr.splice(i, 1);
				i--;
			}
		}
		return arr;
	}

	protected spacePlaceholder(length: number): string {
		return this.spacePlaceholderStr.repeat(length);
	}

	protected lineAtIndex(str: string, idx: number): string {

		// return str.substring(str.substr(0, idx).lastIndexOf("\n") + 1, idx + str.substr(idx).indexOf("\n"));

		var first = str.substring(0, idx);
		var last = str.substring(idx);

		var firstNewLine = first.lastIndexOf("\n");

		var secondNewLine = last.indexOf("\n");

		if (secondNewLine == -1) {
			secondNewLine = last.length;
		}

		return str.substring(firstNewLine + 1, idx + secondNewLine);
	}

	protected indent(amount: number) {
		amount = amount < 0 ? 0 : amount;
		return this.spacePlaceholderStr.repeat(amount * 4);
		// var s = '';
		// for (var j = 0; j < this.depth; j++) s += ' ';
		// return s;
	}
}




export function activate(context: ExtensionContext) {

	let docFilter: DocumentFilter = { scheme: 'file' };
	context.subscriptions.push(languages.registerDocumentFormattingEditProvider(docFilter, new DocumentFormat()));
	// languages.registerOnTypeFormattingEditProvider(docFilter, new DocumentFormat());

}
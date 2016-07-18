import {
	workspace, DocumentFormattingEditProvider, Selection,
	OnTypeFormattingEditProvider, WorkspaceConfiguration,
	languages, ExtensionContext, TextEdit, Position, DocumentFilter,
	TextDocument, FormattingOptions, CancellationToken, Range,
	TextEditor, commands
} from 'vscode';

import { Format } from './format';

// Get global configuration settings
var config: WorkspaceConfiguration = workspace.getConfiguration('format');
var onType: boolean = config.get<boolean>('onType', true);
var disabled: Array<string> = config.get<Array<string>>('disabled');
var workspaceDisabled: boolean = config.get<boolean>('workspaceDisabled', false);

// Update the configuration settings if the configuration changes
workspace.onDidChangeConfiguration(e => {
	config = workspace.getConfiguration('format');
	onType = config.get<boolean>('onType', true);
	disabled = config.get<Array<string>>('disabled');
	workspaceDisabled = config.get<boolean>('workspaceDisabled', false);
});

workspace.onDidOpenTextDocument(document => {
	console.log(`Document Id: ${document.languageId}`);
})

// Format the code on type
class DocumentTypeFormat implements OnTypeFormattingEditProvider {
	public provideOnTypeFormattingEdits(document: TextDocument, position: Position, ch: string, options: FormattingOptions, token: CancellationToken): Thenable<TextEdit[]> {
		// Don't format if onType is disabled
		if (!onType) { return; }
		// Don't format if the language is in the disabled list
		if (disabled.indexOf(document.languageId) > -1 || workspaceDisabled) { return; }
		// Format the document
		return format(document, null, options);
	}
}

// Format the code when the format keybindings are pressed
class DocumentFormat implements DocumentFormattingEditProvider {
	public provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions, token: CancellationToken): Thenable<TextEdit[]> {
		// Don't format if the language is in the disabled list
		if (disabled.indexOf(document.languageId) > -1 || workspaceDisabled) { return; }
		// Format the document
		return format(document, null, options);
	}
}

// Execute the format edits
function format(document: TextDocument, range: Range, options: FormattingOptions): Thenable<TextEdit[]> {
	return new Promise(resolve => {
		// Create an empty list of changes
		let result: TextEdit[] = [];
		// Create a full document range
		if (range === null) {
			var start = new Position(0, 0);
			var end = new Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
			range = new Range(start, end);
		}
		// Format the document with the user specified settings
		var newText: string = Format.document(document.getText(), options, document.languageId);
		// Push the edit into the result array
		result.push(new TextEdit(range, newText));
		// Return the result of the change
		return resolve(result);
	});
}

// When the extention gets activated
export function activate(context: ExtensionContext) {
	console.log('Activating vscode-format');
	// Set the document filter to files
	let docFilter: DocumentFilter = { scheme: 'file' };
	// Register the format provider
	context.subscriptions.push(languages.registerDocumentFormattingEditProvider(docFilter, new DocumentFormat()));
	// Register the onType format provider
	context.subscriptions.push(languages.registerOnTypeFormattingEditProvider(docFilter, new DocumentTypeFormat(), '\n', '\r\n', ';'));

	// context.subscriptions.push(commands.registerCommand('format.workspace', function () {
	// 	workspace.findFiles('**/*.*', '').then();
	// }));
}
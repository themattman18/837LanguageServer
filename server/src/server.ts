/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult,
	HoverParams,
	Hover
} from 'vscode-languageserver/node';

import {
	TextDocument,
} from 'vscode-languageserver-textdocument';

import * as vscode from 'vscode';
import { connect } from 'http2';
import { exit } from 'process';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
let connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			},
			hoverProvider: true
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	// documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'languageServerExample'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	//validateTextDocument(change.document);
});

// async function validateTextDocument(textDocument: TextDocument): Promise<void> {
// 	// In this simple example we get the settings for every validate run.
// 	let settings = await getDocumentSettings(textDocument.uri);

// 	// The validator creates diagnostics for all uppercase words length 2 and more
// 	let text = textDocument.getText();
// 	let pattern = /\b[A-Z]{2,}\b/g;
// 	let m: RegExpExecArray | null;

// 	let problems = 0;
// 	let diagnostics: Diagnostic[] = [];
	
// 	while ((m = pattern.exec(text)) && problems < settings.maxNumberOfProblems) {
// 		problems++;
// 		let diagnostic: Diagnostic = {
// 			severity: DiagnosticSeverity.Warning,
// 			range: {
// 				start: textDocument.positionAt(m.index),
// 				end: textDocument.positionAt(m.index + m[0].length)
// 			},
// 			message: `${m[0]} is all uppercase.`,
// 			source: 'ex'
// 		};

// 		if (hasDiagnosticRelatedInformationCapability) {
// 			diagnostic.relatedInformation = [
// 				{
// 					location: {
// 						uri: textDocument.uri,
// 						range: Object.assign({}, diagnostic.range)
// 					},
// 					message: 'Spelling matters'
// 				},
// 				{
// 					location: {
// 						uri: textDocument.uri,
// 						range: Object.assign({}, diagnostic.range)
// 					},
// 					message: 'Particularly for names'
// 				}
// 			];
// 		}

// 		diagnostics.push(diagnostic);
// 	}

// 	// Send the computed diagnostics to VSCode.
// 	connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
// }

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [
			{
				label: 'TypeScript',
				kind: CompletionItemKind.Text,
				data: 1
			},
			{
				label: 'JavaScript',
				kind: CompletionItemKind.Text,
				data: 2
			}
		];
	}
);

connection.onHover(x => getHoverInfo(x));

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {

		// if (item.data === 1) {
		// 	item.detail = 'TypeScript details';
		// 	item.documentation = 'TypeScript documentation';
		// } else if (item.data === 2) {
		// 	item.detail = 'JavaScript details';
		// 	item.documentation = 'JavaScript documentation';
		// }
		return item;
	}
);



// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

// vscode.languages.registerHoverProvider('837', {
//   provideHover(document, position, token) {
//     return {
//       contents: ['Hover Content']
//     };
//   }
// });


async function getHoverInfo(textDocumentPosition: TextDocumentPositionParams): Promise<Hover | null> {

	const document = documents.get(textDocumentPosition.textDocument.uri) as TextDocument;
	let lineIndex = textDocumentPosition.position.line;
	let charIndex = textDocumentPosition.position.character;
	let description = "";

	const start = {
		line: textDocumentPosition.position.line,
		character: 0,
	};
	const end = {
		line: textDocumentPosition.position.line + 1,
		character: 0,
	};
	const text = document.getText({ start, end });
	// const index = document.offsetAt(textDocumentPosition.position) - document.offsetAt(start);

	if (charIndex <= 3 && text.charAt(charIndex) != "*") {

		let word = null; 
		// Two letter word
		if (text.charAt(2) == "*") {
			word = text.substring(0, 2);
		}
		else {
			word = text.substring(0, 3);
		}

		let test = wordIndex.get(word);

		if (test != undefined) {

			test.forEach(element => {
				if (text.startsWith(validWords[element].prefix)) {
					description = validWords[element].note;
					exit;
				}
			});

		}

		return { contents: {
			kind: 'markdown',
			value: description,
		}};

	}

	return null;
	
	// let ambientClass = this._classLookup[textDocumentPosition.textDocument.uri];
	// if (! ambientClass) return null;
	
	// let lineIndex = textDocumentPosition.position.line;
	// let charIndex = textDocumentPosition.position.character;
	// let fullLine = ambientClass.lines[lineIndex];
	// if (!fullLine.charAt(charIndex).match(symbolMatcher)) return null;
	
	// let externalClass = await this.retrieveImportAtLine(fullLine, ambientClass, charIndex);
	// if (! externalClass) externalClass = await this.retrieveSuperclassAtLine(fullLine, ambientClass, charIndex);
	// if (externalClass) {
	// 	return {
	// 		contents: {
	// 			language: 'actionscript',
	// 			value: externalClass.description
	// 		}
	// 	};
	// }
	
	// let line = fullLine.substr(0, charIndex + 1).trim();
	// if (this.positionInsideStringLiteral(line)) return null;
	
	// firstSymbolMatcher.lastIndex = 0;
	// let result = firstSymbolMatcher.exec(fullLine.substr(charIndex + 1));
	// if (result) {
	// 	line += result[1];
	// }
	
	// let symbolChain = this.getSymbolChainFromLine(line);
	// let memberAndClass = await this.traverseSymbolChainToMember(symbolChain, ambientClass, lineIndex, true);
	// let member = memberAndClass && memberAndClass[0];
	// let actionClass = memberAndClass && memberAndClass[1];
	// if (! member) {
	// 	if (! actionClass) return null;
	// 	return {
	// 		contents: {
	// 			language: 'actionscript',
	// 			value: actionClass.description
	// 		}
	// 	};
	// }
	
	// member.description = member.description || describeActionParameter(member);
	
	// return {
	// 	contents: {
	// 		language: 'actionscript',
	// 		value: member.description
	// 	}
	// };
}



var validWords = new Array(
	{prefix:"AMT*F5", note: "Amount (Paitent Paid Loop 2300)"},
	{prefix:"BHT", note: "Beginning Of Hierarchical Transaction"},
	{prefix:"CLM", note: "Claim Information"},
	{prefix:"DMG*D8" , note: "Demographic (Loop 2010BA)"},
	{prefix:"DTP", note: "Service Date(s)"},
	{prefix:"DTP*472", note: "Date of Service (Loop 2400)"},
	{prefix:"HI" , note: "Diagnosis Codes"},
	{prefix:"HL" , note: "Heirarchy (Loop 2000B)"},
	{prefix:"ISA", note: ""},
	{prefix:"LX" , note: "Service Line Counter"},
	{prefix:"NM1*85", note: "Billing Provider Name (Loop 2000A)"},
	{prefix:"NM1*87", note: "Pay-To Provider Name (Loop 2010AB)"},
	{prefix:"NM1*IL", note: "Insured Name (Loop 2010BA)"},
	{prefix:"NM1*PR", note: "Payer Name (Loop 2010BB)"},
	{prefix:"NM1*DN", note: "Refering Provider Name (Loop 2310A)"},
	{prefix:"NM1*82", note: "Rendering Provider Name (Loop 2310B)"},
	{prefix:"NM1*77", note: "Service Facility Name (Loop 2310C)"},
	{prefix:"N3" , note: "Street Address"},
	{prefix:"N4" , note: "City, State, Zip"},
	{prefix:"NTE" , note: "Note"},
	{prefix:"PRV*BI", note: "Billing Provider Specialty Information"},
	{prefix:"PRV*PE", note: "Provider (Loop 2310B)"},
	{prefix:"PWK" , note: "Workers Comp and Auto"},
	{prefix:"PER", note: "Contact"},
	{prefix:"REF", note: "Reference"},
	{prefix:"REF*6R", note: "Reference (Loop 2400)"},
	{prefix:"SBR*P", note: "Subscriber (Primary)"},
	{prefix:"SBR*S", note: "Subscriber (Secondary)"},
	{prefix:"SBR*T", note: "Subscriber (Tertiary)"},
	{prefix:"SV*HC", note: "Service - CPT"},
	{prefix:"SV1", note: "Professional Service"},
	{prefix:"ST" , note: "Transaction Set Header"},
	{prefix:"SE" , note: "Transaction Set Trailer"}
);


var wordIndex = new Map([

	["AMT", [0]],
	["BHT", [1]],
	["CLM", [2]],
	["DMG", [3]],
	["DTP", [4,5]],
	["HI",  [6]],
	["HL",  [7]],
	["ISA", [8]],
	["LX",  [9]],
	["NM1", [10,11,12,13,14,15,16]],
	["N3",  [17]],
	["N4",  [18]],
	["NTE", [19]],
	["PRV", [20,21]],
	["PWK", [22]],
	["PER", [23]],
	["REF", [24, 25]],
	["SBR", [26,27,28]],
	["SV",  [29]],
	["SV1", [30]],
	["ST",  [31]],
	["SE",  [32]]

]);
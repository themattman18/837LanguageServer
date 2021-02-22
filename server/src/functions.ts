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

export class Test{


public static async getHoverInfo(textDocumentPosition: TextDocumentPositionParams): Promise<Hover | null> {
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
}
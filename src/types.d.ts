declare module "xml-zero-lexer" {
	export declare const NodeTypes: {
		readonly XML_DECLARATION: 0; // unofficial
		// Most XML parsers ignore this but because I'm parsing it I may as well include it.
		// At least it lets you know if there were multiple declarations.
		//
		// Also inserting it here makes Object.keys(NodeTypes) array indexes line up with values!
		// E.g. Object.keys(NodeTypes)[0] === NodeTypes.XML_DECLARATION
		// (Strictly speaking map keys are unordered but in practice they are, and we don't rely on it)
		readonly ELEMENT_NODE: 1;
		readonly ATTRIBUTE_NODE: 2;
		readonly TEXT_NODE: 3; // Note that these can include entities which should be resolved before display
		readonly CDATA_SECTION_NODE: 4;
		readonly ENTITY_REFERENCE_NODE: 5; // Not used
		//
		// After a lot of thought I've decided that entities shouldn't be resolved in the Lexer,
		//
		// Instead entities are just ignored and are stored as-is as part of the node because =
		// (1) We only support entities that resolve to characters, we don't support crufty
		//     complicated entities that insert elements, so there's no actual structural need to
		//     do it.
		// (2) It simplifies the code and data structures, and it shrinks data structure memory usage.
		//     E.g. Text doesn't need to switch between TEXT_NODE and ENTITY_REFERENCE_NODE.
		// (3) They can be resolved later using a utility function. E.g. have a .textContent() on
		//     nodes that resolves it. This approach would probably result in less memory use.
		// (4) It's slightly against style of zero-copy because we'd need to make new strings
		//     to resolve the entities. Not a difficult job but again it's unnecessary memory use.
		//
		//  So I've decided that's not the job of this lexer.
		//
		readonly ENTITY_NODE: 6; // Only supported as <!ENTITY ...> outside of <!DOCTYPE ...>
		// E.g. <!DOCTYPE [ <!ENTITY> ]> will just be a string inside DOCTYPE and not an ENTITY_NODE.
		readonly PROCESSING_INSTRUCTION_NODE: 7;
		readonly COMMENT_NODE: 8;
		readonly DOCUMENT_NODE: 9; // Not used. Root elements are just elements.
		readonly DOCUMENT_TYPE_NODE: 10;
		readonly DOCUMENT_FRAGMENT_NODE: 11; // Don't support this either
		readonly NOTATION_NODE: 12;
		readonly CLOSE_ELEMENT: 13; // unofficial
		readonly JSX_ATTRIBUTE: 14; // unofficial
		readonly JSX: 15; // unofficial
	};
	interface Options {
		blackholes?: Array<string>;
		jsx: boolean;
		html: boolean;
	};
	declare function Lexx(xml: string, options?: Options): number[][];
	export default Lexx;

}
declare module "expand-home-dir";

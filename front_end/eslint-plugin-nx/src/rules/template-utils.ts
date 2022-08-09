import type {
    ParseSourceSpan,
    TmplAstElement
} from '@angular-eslint/bundled-angular-compiler';
import { TSESTree } from '@typescript-eslint/utils';

export enum TMPL_AST_NODES {
    Element$1 = 'Element$1',
    Text$3 = 'Text$3',
    BoundText = 'BoundText',
}

/** Add parent attribute since Angular compiler types don't include it. */
export type WithParent<AstElem, Parent = TmplAstElement> = AstElem & {
    parent: Parent;
};

/** Add type attribute since Angular compiler types don't include it. */
export type WithType<AstElem, Type = TMPL_AST_NODES> = AstElem & {
    type: Type;
};

/**
 * Adaptation of `convertNodeSourceSpanToLoc()` from `@angular-eslint/template-parser`.
 */
export function sourceSpanToLoc(
    sourceSpan: ParseSourceSpan,
    fullStart: boolean = false
): TSESTree.SourceLocation {
    return {
        start: fullStart ? {
            line: sourceSpan.fullStart.line + 1,
            column: sourceSpan.fullStart.col,
        } : {
            line: sourceSpan.start.line + 1,
            column: sourceSpan.start.col,
        },
        end: {
            line: sourceSpan.end.line + 1,
            column: sourceSpan.end.col,
        },
    };
}

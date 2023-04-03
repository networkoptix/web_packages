"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sourceSpanToLoc = exports.TMPL_AST_NODES = void 0;
var TMPL_AST_NODES;
(function (TMPL_AST_NODES) {
    TMPL_AST_NODES["Element$1"] = "Element$1";
    TMPL_AST_NODES["Text$3"] = "Text$3";
    TMPL_AST_NODES["BoundText"] = "BoundText";
})(TMPL_AST_NODES = exports.TMPL_AST_NODES || (exports.TMPL_AST_NODES = {}));
function sourceSpanToLoc(sourceSpan, fullStart = false) {
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
exports.sourceSpanToLoc = sourceSpanToLoc;

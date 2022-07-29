/**
 * @fileoverview
 *
 * @author
 */

import { createRule } from './utils';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

export = createRule({
    name: 'rule-name',
    meta: {
        docs: {
            description: '',
            recommended: false
        },
        type: 'problem',
        schema: [],
        messages: {},
        // fixable: 'code',
        // hasSuggestions: true,
    },
    defaultOptions: [],
    create(context) {
        return {
        };
    }
});

/**
 * @fileoverview
 */

import { createRule } from './utils';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Rule Definition
// ----------------------------------------------------------------------------

export = createRule({
    meta: {
        type: 'problem',
        schema: [],
        messages: {},
        // fixable: 'code',
        // hasSuggestions: true,
    },
    defaultOptions: [],
    create(context) {
        return {};
    },
});

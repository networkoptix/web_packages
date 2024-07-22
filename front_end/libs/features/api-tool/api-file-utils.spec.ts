import { MenuNodeWithParent } from '@components/developers-menu/developers-menu-types';

import { generateMenuNodesFromEndpoints } from './api-file-utils';
import { APIDoc } from './api-tool-types';

describe('generateMenuNodesFromEndpoints', () => {
    // Arrange
    const parentMenuFactory = (name: string): MenuNodeWithParent[] => [
        {
            name,
            url: '/doc/developers/api-tool/json-rpc-1',
            display_name: 'JSON-RPC',
            nodes: [],
            authentication: 'Both',
            new_window: false,
            asset_id: null,
            related_asset_ids: [],
            next_item: false,
            urlified: '',
            subtitle: '',
            name_raw: '',
            invisible: false,
            queryParamsHandling: '',
            icon: '',
            currentRoute: false,
        } as MenuNodeWithParent,
    ];

    const tags = [
        'JSON-RPC-1',
        '/jsonrpc - GET',
        'JSON-RPC-2',
        '/jsonrpc - GET',
        'JSON-RPC-3',
        '/jsonrpc - GET',
    ] as const;

    const apiDoc = {
        paths: {
            '/jsonrpc': {
                get: {
                    tags,
                },
            },
        },
        tags: tags.map(tag => ({ name: tag })),
    } as unknown as APIDoc;

    it('should include node if tags exist anywhere on the tags array', () => {
        for (const tag of tags) {
            // Arrange
            const menu = parentMenuFactory(tag);

            // Act
            generateMenuNodesFromEndpoints(apiDoc, menu);

            // Assert
            expect(menu[0].nodes.length).toBe(1);
        }
    });

    it('should should not include tags not defined for api doc', () => {
        // Arrange
        const menu = parentMenuFactory('invalid');

        // Act
        generateMenuNodesFromEndpoints(apiDoc, menu);

        // Assert
        expect(menu[0].nodes.length).toBe(0);
    });
});

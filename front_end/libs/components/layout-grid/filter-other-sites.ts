import { memoize } from 'lodash-es';

import { assertResourceParentNode } from './layout-grid.type-guards';
import { ResourceNode } from './layout-grid.types';

type ResourceNodeWithMatches = ResourceNode & { matches?: number };

export const filterOtherSites = memoize(
    (
        otherSites: ResourceNodeWithMatches[],
        query: string,
    ): { matches: number; results: ResourceNodeWithMatches[] } => {
        query = query.toLowerCase();

        const results = otherSites
            .map(result => {
                if (assertResourceParentNode(result)) {
                    const { matches, results } = filterOtherSites(result.children, query);

                    return {
                        ...result,
                        children: results as typeof result.children,
                        matches: result.name.toLowerCase().includes(query) ? matches + 1 : matches,
                    };
                }

                return { ...result, matches: result.name.toLowerCase().includes(query) ? 1 : 0 };
            })
            .filter(({ matches }) => matches);
        const matches = results.reduce((acc, result) => acc + (result.matches || 0), 0);
        return { matches, results };
    },
    (otherSites, query) => otherSites.map(node => node.details?.id).join('') + query,
);

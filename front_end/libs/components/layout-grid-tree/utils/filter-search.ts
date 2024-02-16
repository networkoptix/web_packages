import { cloneDeep } from 'lodash-es';

import { ResourceNode } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';

export const filterSearch = <DataType extends ResourceNode, QueryType extends string>(
    dataSource: DataType[],
    query: QueryType,
    valueGetter: (item: DataType) => QueryType,
    childrenGetter: (item: DataType) => DataType[],
    showNodeFn: (item: DataType, matched: boolean) => boolean = (_, matched) => matched,
    filter = false,
    compareFn: (query: QueryType, value: QueryType) => boolean = (query, value) =>
        value.toLowerCase().includes(query.toString().toLowerCase()),
): DataType[] => {
    return query
        ? cloneDeep(dataSource).map(node => {
              node.children = node.children?.map(node => ({
                  ...node,
                  hidden:
                      !filter &&
                      !node.name.toLowerCase().includes(query.toLowerCase()) &&
                      node.details.id !== 'noResults',
              }));
              node.hidden = node.children?.every(node => node.hidden);
              if (node.hidden) {
                  node.children?.push({
                      name: staticLang.search.noMatches,
                      details: { id: 'noResults' },
                      type: null,
                      aspectRatio: 0,
                  });
              }
              return node;
          })
        : dataSource;
};

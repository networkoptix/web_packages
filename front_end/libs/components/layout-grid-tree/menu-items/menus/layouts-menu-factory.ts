import { untilDestroyed } from '@ngneat/until-destroy';
import { Observable } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

import { MenuItem } from '@components/context-menu/context-menu.types';
import {
    BaseResourceNode,
    ResourceNode,
    ResourceNodeMap,
    ResourceType,
} from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { nxConfig } from '@services/nx-config/config';
import { dirtyId } from '@utils/general';

import { findNode } from '../../utils/find-node';

export const layoutsMenuFactory = (
    createNewLayout: () => string,
    expandNode: (node: BaseResourceNode) => void,
    getLayoutsNode: () => BaseResourceNode | undefined,
    getDataSource: () => Observable<ResourceNode[]>,
    setEditedLayout: ({ id, isNew }: { id: string; isNew: boolean }) => void,
): MenuItem<ResourceNodeMap[ResourceType.LAYOUTS]>[] =>
    nxConfig.featureFlags.layoutsEditable
        ? [
              {
                  id: 'create',
                  name: staticLang.layouts.treeActions.create.name,
                  tooltip: staticLang.layouts.treeActions.create.tooltip,
                  action: ($event, node) => {
                      $event.preventDefault();
                      $event.stopPropagation();
                      const newLayout = createNewLayout();
                      getDataSource()
                          .pipe(
                              map(dataSource => findNode(dataSource, newLayout)),
                              filter(Boolean),
                              take(1),
                              untilDestroyed(this),
                          )
                          .subscribe(node => {
                              const layoutsNode = getLayoutsNode();

                              if (layoutsNode) {
                                  expandNode(layoutsNode);
                              }
                              setEditedLayout({
                                  id: dirtyId(newLayout),
                                  isNew: true,
                              });
                          });
                  },
              },
          ]
        : [];

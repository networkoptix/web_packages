import { v4 as uuid } from 'uuid';

import { LayoutItem } from '@services/system-api.types/layouts.types';

import { openSpotGenerator } from './open-spot-generator';

type GridBoundary = Pick<LayoutItem, 'top' | 'left' | 'bottom' | 'right'>;

export const createAddedItems = (
    currentItems: LayoutItem[],
    itemsToAdd: LayoutItem[],
): LayoutItem[] => {
    const updateBoundary = (
        { top, left, bottom, right }: GridBoundary,
        item: LayoutItem,
    ): GridBoundary => ({
        top: Math.max(top, item.top),
        left: Math.min(left, item.left),
        bottom: Math.min(bottom, item.bottom),
        right: Math.max(right, item.right),
    });

    const gridBoundary: GridBoundary = currentItems.length
        ? currentItems.reduce(updateBoundary, {
              top: -Infinity,
              left: Infinity,
              bottom: Infinity,
              right: -Infinity,
          })
        : {
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
          };

    const origin = {
        x: Math.round((gridBoundary.left + gridBoundary.right - 2) / 2),
        y: Math.round((gridBoundary.top + gridBoundary.bottom - 2) / 2),
    };

    const mappedItems: LayoutItem[] = [];

    for (const { x, y } of openSpotGenerator(currentItems, origin)) {
        const position = { top: y, left: x, bottom: y + 1, right: x + 1 };
        mappedItems.push({ ...itemsToAdd[mappedItems.length], ...position, id: uuid() });
        if (mappedItems.length >= itemsToAdd.length) {
            break;
        }
    }

    return [...currentItems, ...mappedItems];
};

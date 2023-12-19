import md5 from 'md5';
import stringify from 'safe-stable-stringify';

import { DocId } from '@services/nx-cloud-api/cloud-services/doc-db/doc-db-api.types';
import { Layout } from '@services/system-api.types';
import { cleanId, dirtyId } from '@utils/general';

import {
    LayoutTypes,
    SavedCrossSystemLayoutState,
    SavedLocalLayoutState,
    UnsavedState,
} from './types/layout-state.types';

export const hashItem = ({ id, ...layout }: Layout): string =>
    md5(stringify({ ...layout, id: dirtyId(id) }));

export const toLocalLayoutState = (layout: Layout): SavedLocalLayoutState => ({
    id: layout.id,
    layout,
    layoutType: LayoutTypes.LOCAL,
    unsaved: UnsavedState.SAVED,
    baseVersion: hashItem(layout),
});

export const toCrossSystemLayoutState = (layout: Layout): SavedCrossSystemLayoutState => ({
    id: layout.id,
    layout,
    layoutType: LayoutTypes.CROSS_SYSTEM,
    unsaved: UnsavedState.SAVED,
    baseVersion: hashItem(layout),
});

export const fromCrossSystemLayoutPayload = ({ docId, id, ...layout }: Layout & DocId): Layout => ({
    id: dirtyId(id),
    ...layout,
});

export const toCrossSystemLayoutPayload = ({
    parentId,
    id,
    ...layout
}: Layout): Layout & DocId => ({
    ...layout,
    id: cleanId(id),
    docId: `${cleanId(id)}.json`,
});

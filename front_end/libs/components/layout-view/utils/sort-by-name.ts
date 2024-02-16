import { alphaNumericSort } from '@utils/general';

import { Resource } from './layout-view-utils.types';

export const sortByName = alphaNumericSort<Pick<Resource, 'name'>>(r => r.name || '');

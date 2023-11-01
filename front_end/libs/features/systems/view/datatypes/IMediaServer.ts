import { ViewBaseServer } from '@services/system.service/system-server-types';

import { ViewCamera } from './Camera';

export interface ViewMediaServer extends Omit<ViewBaseServer, 'cameras'> {
    cameras: ViewCamera[];
}

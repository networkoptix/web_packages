import { ViewBaseServer } from '@services/system.service/types/servers.types';

import { ViewCamera } from './Camera';

export interface ViewMediaServer extends Omit<ViewBaseServer, 'cameras'> {
    cameras: ViewCamera[];
}

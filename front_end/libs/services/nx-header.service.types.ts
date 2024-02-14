import { ModuleInfo } from './system.service/system-types';
import { NxSystemInfo } from './systems.service.types';

export type activeSystemType = NxSystemInfo | ModuleInfo;

export type createButtonType = 'default' | 'primary';

export interface MenuNodeNavProps {
    url: string;
    new_window: boolean;
    queryParamsHandling?;
}

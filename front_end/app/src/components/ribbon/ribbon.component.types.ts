import type { Process } from '@services/process.service';

export interface RibbonAction {
    type: 'link' | 'process-button',
    text: string,
    value: string | Process,
    external?: boolean
}

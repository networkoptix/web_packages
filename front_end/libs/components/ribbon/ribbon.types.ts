import { Translatable } from '@pipes/any-translate.types';
import type { Process } from '@services/process.service/process';

interface RibbonProcessAction {
    type: 'process-button',
    text: Translatable,
    value: Process,
    external?: boolean
}

interface RibbonLinkAction {
    type: 'link',
    text: Translatable,
    value: string,
    external?: boolean
}

export type RibbonAction = RibbonProcessAction | RibbonLinkAction;

export interface RibbonContext {
    visibility: boolean;
    message: Translatable;
    actions: RibbonAction[];
    type?: string;
    updateFunction?: () => void;
}

import { Translatable } from '@pipes/nx-translate.types';
import type { Process } from '@services/process.service/process';

interface RibbonProcessAction {
    type: 'process-button';
    text: Translatable;
    value: Process;
    external?: boolean;
}

interface RibbonLinkAction {
    type: 'link';
    text: Translatable;
    value: string;
    external?: boolean;
}

interface RibbonButtonAction {
    type: 'button';
    text: Translatable;
    value: () => void;
}

export type RibbonAction = RibbonProcessAction | RibbonLinkAction | RibbonButtonAction;

export interface RibbonContext {
    visibility: boolean;
    message: Translatable;
    actions: RibbonAction[];
    type?: string;
    updateFunction?: () => void;
}

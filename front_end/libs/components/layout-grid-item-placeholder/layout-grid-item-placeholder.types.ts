import { Translatable } from '@pipes/nx-translate.types';

export interface Placeholder {
    message: string;
    isError: boolean;
    icon?: string;
    hint?: Translatable;
    description?: string;
    actionName?: string;
    action?: () => void;
}

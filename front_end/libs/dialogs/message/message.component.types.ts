import { Translatable } from '@pipes/any-translate.types';

export interface MessageParams {
    disclaimer: Translatable;
    email?: string;
    asset: string;
    assetId?: string;
    to?: string;
}

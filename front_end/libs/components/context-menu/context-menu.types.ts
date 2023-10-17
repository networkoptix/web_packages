import { Signal } from '@angular/core';

export type MenuItemAction<T> = ($event: MouseEvent | KeyboardEvent, context?: T) => void;

export type MenuItem<T> = {
    id?: string;
    name: string | 'divider';
    tooltip?: string;
    icon?: string;
    action?: MenuItemAction<T>;
    subMenu?: MenuItem<T>[] | MenuItemsFactoryCallback<T>;
    checked$$?: Signal<boolean>;
};

export type MenuItemsFactoryCallback<Context> = (
    context: Context,
) => MenuItem<Context>[] | undefined;

import { Signal } from '@angular/core';

export type MenuItemAction<T> = ($event: MouseEvent | KeyboardEvent, context?: T) => void;

export type MenuItemsFactoryCallback<Context> = (
    context: Context,
) => MenuItem<Context>[] | Promise<MenuItem<Context>[] | undefined> | undefined;

export type MenuItemsOrMenuItemsCallback<T> = MenuItem<T>[] | MenuItemsFactoryCallback<T>;

export type MenuItem<T> = {
    id?: string;
    name: string | 'divider';
    tooltip?: string;
    icon?: string;
    action?: MenuItemAction<T>;
    subMenu?: MenuItemsOrMenuItemsCallback<T>;
    disabled$$?: Signal<boolean>;
    checked$$?: Signal<boolean>;
};

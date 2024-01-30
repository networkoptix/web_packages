import { Signal } from '@angular/core';

export type MenuItemAction<T> = ($event: MouseEvent | KeyboardEvent, context?: T) => void;

export type MenuItemsFactoryCallback<Context> = (
    context: Context,
) => MenuItem<Context>[] | Promise<MenuItem<Context>[] | undefined> | undefined;

export type MenuItemsOrMenuItemsFactory<T> = MenuItem<T>[] | MenuItemsFactoryCallback<T>;

export interface BaseMenuItem {
    id?: string;
    name: string | 'divider';
    tooltip?: string;
    icon?: string;
    disabled$$?: Signal<boolean>;
    checked$$?: Signal<boolean>;
}

export interface MenuItem<T> extends BaseMenuItem {
    action?: MenuItemAction<T>;
    subMenu?: MenuItemsOrMenuItemsFactory<T>;
}

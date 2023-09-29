export type MenuItem<T> = {
    id?: string;
    name: string | 'divider';
    tooltip?: string;
    icon?: string;
    action?: ($event: MouseEvent | KeyboardEvent, context?: T) => void;
    subMenu?: MenuItem<T>[] | MenuItemsFactoryCallback<T>;
    checked?: boolean;
};

export type MenuItemsFactoryCallback<Context> = (context: Context) => MenuItem<Context>[];

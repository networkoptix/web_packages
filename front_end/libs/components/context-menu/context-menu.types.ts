export type MenuItem<T> = {
    id?: string;
    name: string | 'divider';
    tooltip?: string;
    action?: ($event: MouseEvent | KeyboardEvent, context?: T) => void;
    subMenu?: MenuItem<T>[];
};

export interface Placeholder {
    message: string;
    isError: boolean;
    icon?: string;
    hint?: string;
    description?: string;
    actionName?: string;
    action?: () => void;
}

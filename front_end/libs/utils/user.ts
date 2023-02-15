let user: string;
/**
 * We reload the whole app when the user changes.
 * If we ever change that then we should check localStorage each time.
 */
export const getUser = (): string => {
    user ??= window.localStorage.getItem('ngx-webstorage|loginstate');
    return user;
};

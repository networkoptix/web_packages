export type createButtonType = 'default' | 'primary';

export interface MenuNodeNavProps {
    url: string;
    // eslint-disable-next-line camelcase
    new_window: boolean;
    queryParamsHandling?;
}

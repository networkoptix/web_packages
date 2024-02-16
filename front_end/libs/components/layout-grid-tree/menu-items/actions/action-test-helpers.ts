import { BaseMenuItem, MenuItem } from '@components/context-menu/context-menu.types';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const availableActions = (actions: string[], withPartial: Partial<BaseMenuItem> = {}) =>
    actions.map(id =>
        id === 'divider'
            ? { id, name: expect.any(String) }
            : {
                  id,
                  name: expect.any(String),
                  action: expect.any(Function),
                  ...withPartial,
              },
    );

export const performItemAction =
    (actions: MenuItem<unknown>[]) =>
    <T>(id: string, node: T): void => {
        const item = actions.find(action => action.id === id);

        if (item && 'action' in item && item.action) {
            item.action(new MouseEvent('click'), node);
        }
    };

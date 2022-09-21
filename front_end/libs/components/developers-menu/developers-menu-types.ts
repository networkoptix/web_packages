import type { MenuNode } from '../../services/menus.service.types';

export type MenuNodeWithParent = MenuNode & { parentNode?: MenuNode };

export interface RelatedLinks {
    type: string,
    nodes: MenuNodeWithParent[]
}

export interface ClickEvent {
    node: MenuNodeWithParent,
    clearSearch: boolean
}

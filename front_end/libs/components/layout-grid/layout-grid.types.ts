import { Observable, ObservedValueOf } from 'rxjs';

import type { Layout, LayoutItem } from '@services/system-api.types';

export interface Setting {
    label: string;
    type: string;
    name?: string;
    step?: number | 'any';
    min?: number;
    max?: number;
}

export interface Point {
    x: number;
    y: number;
}

export interface Size {
    width: number;
    height: number;
}

export interface GridWrapper {
    'grid-template-columns': string;
    'grid-template-rows': string;
}

export interface LayoutRenderConfig {
    aspectRatio: number;
    spacing: number;
    columns: number;
    rows: number;
    gridWrapper: GridWrapper;
    origin: Point;
}

export interface ParsedLayout extends Layout {
    renderConfig: LayoutRenderConfig;
    settings: Setting[];
}

export enum PlaceholderState {
    NONE,
    ICON_ONLY,
    WITH_TITLE,
    FULL,
}

export enum PlaceholderClasses {
    SMALL = 'small',
    MEDIUM = 'medium',
    LARGE = 'large',
}

export interface LayoutItemRenderConfig {
    child?: {
        'max-height': string;
        'max-width': string;
    };
    aspect?: number;
    showTooltip: boolean;
    placeholderState: PlaceholderState;
    placeholderClass: `${PlaceholderClasses}`;
    maxPlaceholderSize: number;
    hasSecondaryPanel: boolean;
}

export interface ParsedLayoutItem extends LayoutItem {
    renderConfig: LayoutItemRenderConfig;
}

export type ParsedLayoutItems = ParsedLayoutItem[];

export interface Position {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export interface NewPosition extends Position {
    transform: string;
}

export enum ResourceType {
    LAYOUT = 'layout',
    LAYOUTS = 'layouts',
    CAMERA = 'camera',
    CAMERAS = 'cameras',
    SERVER = 'server',
    SERVERS = 'servers',
    WEB_PAGE = 'webpage',
    WEB_PAGES = 'webpages',
    IO_DEVICE = 'iodevice',
}

export interface BaseResourceNode {
    name: string;
    type: ResourceType;
    children?: BaseResourceNode[];
}

export interface ResourceNode<T = { id: string }> {
    name: string;
    aspectRatio?: number;
    type: ResourceType;
    children?: ResourceNode[];
    details: T;
}

export interface LayoutResourceTree {
    tree: BaseResourceNode[];
}

export type ServerStats = { description: string; value: string }[] | undefined | null;

export type ServerStatsObservable = Observable<
    ObservedValueOf<
        Observable<{
            error: string;
            statistics: ServerStats;
        }>
    >
>;

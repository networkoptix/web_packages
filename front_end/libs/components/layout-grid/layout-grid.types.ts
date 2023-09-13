import { Observable, ObservedValueOf } from 'rxjs';

import type { Layout, LayoutItem, WebPage } from '@services/system-api.types';
import {
    NxSystemCamera,
    RecordingStatus,
} from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemServer } from '@services/system.service/system-server-types';

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
}

export interface ResourceParentNode<T = { id: string }> {
    name: string;
    type: ResourceType;
    children: ResourceLeafNode<T>[];
    hidden?: boolean;
    details: T;
}

export interface ResourceLeafNode<T = { id: string }> {
    name: string;
    aspectRatio: number;
    type: ResourceType;
    hidden?: boolean;
    details: T;
}

export interface SharableResourceLeafNode<T = { id: string }>
    extends Omit<ResourceLeafNode<T>, 'aspectRatio'> {
    shared: boolean;
}

export interface MergedResourceNode<T = { id: string }>
    extends ResourceLeafNode<T>,
        ResourceParentNode<T> {}

export type ResourceNode<T = { id: string }> = Partial<MergedResourceNode<T>> & BaseResourceNode;

export interface CameraWithRecordingStatus extends NxSystemCamera {
    recordingStatus: RecordingStatus;
}

export interface ResourceParentNodeMap {
    [ResourceType.LAYOUTS]: ResourceParentNode<Layout>;
    [ResourceType.CAMERAS]: ResourceParentNode<CameraWithRecordingStatus>;
    [ResourceType.SERVERS]: ResourceParentNode<NxSystemServer>;
    [ResourceType.WEB_PAGES]: ResourceParentNode<WebPage>;
}

export interface ResourceLeafNodeMap {
    [ResourceType.LAYOUT]: SharableResourceLeafNode<Layout>;
    [ResourceType.CAMERA]: ResourceLeafNode<CameraWithRecordingStatus>;
    [ResourceType.SERVER]: ResourceLeafNode<NxSystemServer>;
    [ResourceType.WEB_PAGE]: ResourceLeafNode<WebPage>;
    [ResourceType.IO_DEVICE]: ResourceLeafNode<CameraWithRecordingStatus>;
}

export interface ResourceNodeMap extends ResourceParentNodeMap, ResourceLeafNodeMap {}

export type isResourceType<T extends ResourceType> = (
    node: BaseResourceNode,
) => node is ResourceNodeMap[T];

export type ResourceTypeAssertMap = {
    [key in keyof ResourceNodeMap]: isResourceType<key>;
};

// export type isParentNodeResourceType<T extends keyof ResourceParentNodeMap> = (
//     node: BaseResourceNode,
// ) => node is ResourceParentNodeMap[T];

// export type ResourceParentNodeAssertMap = {
//     [key in keyof ResourceParentNodeMap]: isParentNodeResourceType<key>;
// };

// export type isLeafNodeResourceType<T extends keyof ResourceLeafNodeMap> = (
//     node: BaseResourceNode,
// ) => node is ResourceLeafNodeMap[T];

// export type ResourceLeafNodeAssertMap = {
//     [key in keyof ResourceLeafNodeMap]: isLeafNodeResourceType<key>;
// };

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

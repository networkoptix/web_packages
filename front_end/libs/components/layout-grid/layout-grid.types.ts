import { Point } from '@angular/cdk/drag-drop';
import { Signal } from '@angular/core';
import { Observable, ObservedValueOf } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { Translatable } from '@pipes/nx-translate.types';
import { GroupItem } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import type { Layout, LayoutItem, WebPage } from '@services/system-api.types/layouts.types';
import {
    NxSystemCamera,
    RecordingStatus,
} from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemServer } from '@services/system.service/types/servers.types';
import { NxSystemInfo } from '@services/systems.service.types';

export interface Setting {
    label: string;
    type: string;
    name?: string;
    step?: number | 'any';
    min?: number;
    max?: number;
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
        'aspect-ratio': number | string;
    };
    aspect?: number;
    showTooltip: boolean;
    placeholderState: PlaceholderState;
    placeholderClass: `${PlaceholderClasses}`;
    maxPlaceholderSize: number;
    hasSecondaryPanel: boolean;
}

export interface ParsedLayoutItem extends LayoutItem {
    /** @deprecated */
    systemStatusOld$$: Signal<Translatable>;
    renderConfig: LayoutItemRenderConfig;
}

export type ParsedLayoutItems = ParsedLayoutItem[];

export interface ParsedLayoutWithItems extends ParsedLayout {
    items: ParsedLayoutItems;
    renderConfig: LayoutRenderConfig;
}

export interface Position {
    id?: string;
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
    SYSTEM = 'system_cloud',
    SYSTEMS_ORGANIZATION = 'organization',
    SYSTEMS_GROUP = 'systems_group',
    CAMERAS_GROUP = 'cameras_group',
    PLACEHOLDER = 'placeholder',
}

export interface BaseResourceNode {
    name: string;
    type: ResourceType;
}

export interface ResourceParentNode<T = { id: string }> extends BaseResourceNode {
    children: (ResourceLeafNode<T> | ResourceParentNode<T>)[];
    hidden?: boolean;
    details: T;
}

export interface ResourceLeafNode<T = { id: string }> extends BaseResourceNode {
    aspectRatio: number;
    type: ResourceType;
    hidden?: boolean;
    details: T;
}

export interface OtherSystemsBaseNode
    extends ResourceParentNode<{ children: NxSystemInfo[]; id: 'mySystems' | 'sharedSystems' }> {}

export interface SharableResourceLeafNode<T = { id: string }>
    extends Omit<ResourceLeafNode<T>, 'aspectRatio'> {
    owned: boolean;
    shared: boolean;
    crossSystem: boolean;
    locked: boolean;
}

export interface MergedResourceNode<T = { id: string }>
    extends ResourceLeafNode<T>,
        ResourceParentNode<T> {}

export type ResourceNode<T = { id: string }> = Partial<MergedResourceNode<T>> & BaseResourceNode;

export interface NxSystemCameraWithMappedFields extends NxSystemCamera {
    recordingStatus: RecordingStatus;
    online: boolean;
    unauthorized: boolean;
    requiresTranscoding: boolean;
}

export interface NxSystemServerWithMappedFields extends NxSystemServer {
    online: boolean;
}

export interface ResourceParentNodeMap {
    [ResourceType.LAYOUTS]: ResourceParentNode<Layout>;
    [ResourceType.CAMERAS]: ResourceParentNode<NxSystemCameraWithMappedFields>;
    [ResourceType.SERVERS]: ResourceParentNode<NxSystemServerWithMappedFields>;
    [ResourceType.WEB_PAGES]: ResourceParentNode<WebPage>;
    [ResourceType.SYSTEMS_ORGANIZATION]: ResourceParentNode<NxSystemInfo | GroupItem>;
    [ResourceType.SYSTEMS_GROUP]: ResourceParentNode<NxSystemInfo>;
    [ResourceType.CAMERAS_GROUP]: ResourceParentNode<NxSystemCameraWithMappedFields>;
}

export interface ResourceLeafNodeMap {
    [ResourceType.LAYOUT]: SharableResourceLeafNode<Layout>;
    [ResourceType.CAMERA]: ResourceLeafNode<NxSystemCameraWithMappedFields>;
    [ResourceType.SERVER]: ResourceLeafNode<NxSystemServerWithMappedFields>;
    [ResourceType.WEB_PAGE]: ResourceLeafNode<WebPage>;
    [ResourceType.IO_DEVICE]: ResourceLeafNode<NxSystemCameraWithMappedFields>;
    [ResourceType.SYSTEM]:
        | ResourceParentNode<NxSystemCameraWithMappedFields>
        | ResourceLeafNode<NxSystemInfo>;
    [ResourceType.PLACEHOLDER]: ResourceLeafNode<{ id: 'noResults'; name: string }>;
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

interface TreeNode {
    tree: BaseResourceNode[];
    otherSystems?: BaseResourceNode[];
}

type allExceptLayouts = Exclude<ResourceType, ResourceType.LAYOUT | ResourceType.LAYOUTS>;

interface OtherNodes {
    [key: string]: ResourceNodeMap[allExceptLayouts];
}

export type LayoutResourceTree = Omit<OtherNodes, keyof TreeNode> & TreeNode;

export type ServerStats = { description: string; value: string }[] | undefined | null;

export type ServerStatsObservable = Observable<
    ObservedValueOf<
        Observable<{
            error: string;
            statistics: ServerStats;
        } | null>
    >
>;

export enum LayoutPlaceholder {
    NO_LAYOUTS = 'noLayouts',
    SHOW_404 = 'show404',
}

export const placeholderNameLookup = {
    [LayoutPlaceholder.NO_LAYOUTS]: uuid(),
    [LayoutPlaceholder.SHOW_404]: uuid(),
} as const;

export const isResourceParentNode = (node: BaseResourceNode | null): node is ResourceParentNode =>
    !!node && 'children' in node;

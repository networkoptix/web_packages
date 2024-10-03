import { memoize } from 'lodash-es';

import {
    BaseResourceNode,
    OtherSystemsBaseNode,
    ResourceLeafNode,
    ResourceLeafNodeMap,
    ResourceNodeMap,
    ResourceParentNodeMap,
    ResourceType,
    ResourceTypeAssertMap,
} from './layout-grid.types';

/**
 * Factory to return a function to assert the type of a resource node based on the ResourceNodeMap.
 *
 * @param resourceType - ResourceType
 * @returns - boolean
 */
const assertResourceTypeFactory = memoize(<T extends ResourceType>(resourceType: T) =>
    memoize(
        (node: BaseResourceNode): node is ResourceNodeMap[typeof resourceType] =>
            node?.type === resourceType,
        (node: BaseResourceNode) => node?.type,
    ),
);
/**
 *  Assert the type of a resource node based on the ResourceNodeMap.
 *
 * @param resourceType - ResourceType
 * @param node - BaseResourceNode
 * @returns - boolean
 */

export const assertResourceType = <T extends ResourceType>(
    resourceType: T,
    node: BaseResourceNode,
): node is ResourceNodeMap[typeof resourceType] => assertResourceTypeFactory(resourceType)(node);

/**
 * A lookup for methods to narrow the type of a resource node based on ResourceType.
 *
 * The methods accept a BaseResourceNode and return a boolean.
 *
 * The properties of assertResourceOfType are from the ResourceType enum.
 *
 * @example
 * ```ts
 *  if (assertResourceOfType.layout(node)) {
 *      // The type of node is narrowed to ResourceLeafNode<Layout> within this scope.
 *      doSomethingWith(node);
 *  }
 * ```
 */
export const assertResourceOfType: ResourceTypeAssertMap = Object.values(ResourceType).reduce(
    (acc, resourceType) => ({
        ...acc,
        [resourceType]: assertResourceTypeFactory(resourceType),
    }),
    {} as ResourceTypeAssertMap,
);

const baseNodeTypes = [
    ResourceType.LAYOUTS,
    ResourceType.CAMERAS,
    ResourceType.SERVERS,
    ResourceType.WEB_PAGES,
] as const;

const parentNodeTypes = [
    ...baseNodeTypes,
    ResourceType.SYSTEMS_ORGANIZATION,
    ResourceType.SYSTEMS_GROUP,
    ResourceType.CAMERAS_GROUP,
] as const;

const leafNodeTypes = [
    ResourceType.CAMERA,
    ResourceType.SERVER,
    ResourceType.WEB_PAGE,
    ResourceType.IO_DEVICE,
    ResourceType.SYSTEM,
    ResourceType.PLACEHOLDER,
] as const;

const baseOtherSystemsIds = ['mySystems', 'sharedSystems'];

export const assertResourceBaseNode = (
    node: BaseResourceNode,
): node is ResourceNodeMap[(typeof baseNodeTypes)[number]] =>
    (baseNodeTypes as unknown as ResourceType[]).includes(node.type);

export const assertResourceParentNode = (
    node: BaseResourceNode,
): node is ResourceParentNodeMap[(typeof parentNodeTypes)[number]] =>
    (parentNodeTypes as unknown as ResourceType[]).includes(node.type);

export const assertResourceLeafNode = (
    node: BaseResourceNode,
): node is ResourceLeafNodeMap[(typeof leafNodeTypes)[number]] =>
    (leafNodeTypes as unknown as ResourceType[]).includes(node.type);

export const assertOtherSystemsBaseNode = (node: BaseResourceNode): node is OtherSystemsBaseNode =>
    assertResourceParentNode(node) && baseOtherSystemsIds.includes(node.details.id);

export const assertIsNoResultsNode = (
    node: BaseResourceNode,
): node is ResourceLeafNode<{ id: 'noResults' }> =>
    assertResourceLeafNode(node) && node.details.id === 'noResults';

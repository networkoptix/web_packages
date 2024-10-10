/* eslint-disable @typescript-eslint/no-use-before-define */
import type { MenuNodeWithParent } from '@components/developers-menu/developers-menu-types';
import { environment } from '@environments/environment';
import { MenuNode } from '@services/menus.service.types';
import { MarkdownItem } from '@services/nx-config/base-config';

import type { APIDoc, method, MethodInfo } from './api-tool-types';
import { MarkdownIndex } from './services/api-tool-service-types';

// This file contains functions that modify API files

const RTSPRoute = '/{deviceId}';
const RTSPMethod = 'rtsp';

export const makeTagModifier = (type: any) => {
    const tag = isNaN(type) ? type[0] : type; // TODO: remove once all types are numbers and not strings
    return '-' + tag;
};

export const generateAPIRouteName = (endpoint: string, requestType: string) => {
    return endpoint + ' - ' + requestType.toUpperCase();
};

const appendBaseAPIToolRoute = (endpoint: string) => {
    if (environment.isWebadmin) {
        return '/api-tool/' + endpoint;
    }
    return '/doc/developers/api-tool/' + endpoint;
};

const URLSAFEREGEX = new RegExp('[^a-zA-Z0-9/_-]');

/**
 * Example: rest/v1/users becomes rest-v1-users-get
 */
export const generateNodeURL = (endpoint: string, requestType: string) => {
    // Remove characters that aren't valid in URL, replace / with -, add request type to the end
    const modifiedEndpoint =
        endpoint.slice(1).toLowerCase().split(URLSAFEREGEX).join('').split('/').join('-') +
        '-' +
        requestType.toLowerCase();
    return appendBaseAPIToolRoute(modifiedEndpoint);
};

export const generateSubMenuNodeURL = (tagName: string) => {
    const cleanedTagName = tagName.toLowerCase().split(' ').join('-');
    return appendBaseAPIToolRoute(cleanedTagName);
};

/**
 * Add placeholder if description is blank
 */
const checkMethodResponseDescription = method => {
    if (method.responses?.default?.description === '') {
        method.responses.default.description = 'succesful operation';
    }
};

export const addAPITypeToTags = (api: APIDoc, type: number | string) => {
    // We have to change the tags on apis
    // so that swagger can properly differentiate tags with the same name coming from multiple different API files
    const tagModifier = makeTagModifier(type);
    api.tagsModified = true;

    api.tags.forEach(tag => {
        tag.name = tag.name + tagModifier;
    });

    Object.keys(api.paths).forEach(endpoint => {
        const endpointObj = Object.entries(api.paths[endpoint]);
        endpointObj.forEach(method => {
            if (!api.paths[endpoint][method[0]].tags) {
                // If tags do not exist, create tags array and assign the first tag to it
                api.paths[endpoint][method[0]].tags = [];
                api.paths[endpoint][method[0]].tags.push(api.tags[0].name.slice(0, -2));
            }
            const modifiedTag = api.paths[endpoint][method[0]]?.tags[0] + tagModifier;
            checkMethodResponseDescription(method[1]);
            api.paths[endpoint][method[0]].tags[0] = modifiedTag;
            // Adds the endpoint/summary itself as a tag so that swagger can filter for just the endpoint
            api.paths[endpoint][method[0]].tags.push(
                generateAPIRouteName(endpoint, endpoint === RTSPRoute ? RTSPMethod : method[0]),
            );
        });
    });
    return api;
};

/**
 * Reverse engineers the path and method from an API route node from the developer-menu
 *
 * Example: /rest/v1/devices/{deviceId}/bookmarks/{id} - GET
 *
 * Becomes: { path: /rest/v1/devices/{deviceId}/bookmarks/{id}, method: GET}
 */
export const getPathAndMethodFromNodeName = (name: string) => {
    const seperatorIndex = name.indexOf(' -');
    let path;
    let method;
    if (seperatorIndex !== -1) {
        path = name.slice(0, seperatorIndex);
        method = name.slice(seperatorIndex + 3);
    } else {
        path = name;
    }
    method = method === 'RTSP' ? 'GET' : method;
    return { path, method };
};

export const cleanJSON = (api: APIDoc) => {
    // delete api?.components?.schemas;
    Object.keys(api.paths).forEach(path => {
        const apiPath = api.paths[path];
        Object.keys(apiPath).forEach(requestType => {
            if (apiPath[requestType].deprecated) {
                // Remove this so that swagger's built in styling for deprecated endpoints doesn't trigger
                delete apiPath[requestType].deprecated;
            }
            if (apiPath[requestType].description?.slice(0, 17) === '<p><b>Proprietary') {
                // Remove properietary endpoints
                delete apiPath[requestType];
            }
        });
    });
};

export const prepareSwaggerAPIDoc = (APIDoc: APIDoc, type: number | string) => {
    if (APIDoc.tagsModified) {
        return;
    }

    cleanJSON(APIDoc);
    addAPITypeToTags(APIDoc, type);
};

export const mergeAPIDocs = (mainAPI: APIDoc, mergingAPI: APIDoc) => {
    mainAPI.tags = [...mainAPI.tags, ...mergingAPI.tags];
    for (const path of Object.keys(mainAPI.paths)) {
        // Duplicate paths on different APIs that get merged need to have their tags merged as well
        const mergingRoute = mergingAPI.paths[path];
        if (mergingRoute) {
            for (const requestType of Object.keys(mainAPI.paths[path])) {
                const mainAPITags = mainAPI.paths[path][requestType].tags;
                const mergingAPITags = mergingRoute[requestType]?.tags;
                mergingRoute[requestType].tags = [...mainAPITags, ...mergingAPITags];
            }
        }
    }
    mainAPI.paths = Object.assign(mainAPI.paths, mergingAPI.paths);
};

/**
    Creates the developers-menu content from an API File
 */
export const createMenuContent = (API: APIDoc, seperator: string = '') => {
    const menuContent: MenuNodeWithParent[] = [];
    if (seperator) {
        menuContent.push(new MenuNode(`${seperator}-seperator`, '', seperator));
    }
    generateMenuNodesFromCategoryTags(API, menuContent);
    generateMenuNodesFromEndpoints(API, menuContent);
    return menuContent;
};

export const generateMenu = (menu: MenuNodeWithParent[], json: APIDoc) => {
    generateMenuNodesFromCategoryTags(json, menu);
    generateMenuNodesFromEndpoints(json, menu);
    menu.forEach(node => {
        if (!node.name.includes('-seperator') && !node.nodes.length) {
            menu.splice(menu.indexOf(node), 1);
        }
    });
    return menu;
};

export const addSeperator = (menuContent: MenuNodeWithParent[], seperator: string = '') => {
    menuContent.push(new MenuNode(`${seperator}-seperator`, '', seperator));
};

export const getFirstNode = (menuNodes: MenuNodeWithParent[]) => {
    for (const node of menuNodes) {
        if (!node.name.includes('-seperator')) {
            return node;
        }
    }
    return menuNodes[menuNodes.length - 1];
};

/**
    Adds an API file to the main developers-menu content with a seperator
 */
export const addSeperatedAPIMenu = (
    API: APIDoc,
    menuNodes: MenuNodeWithParent[],
    seperator: string,
) => {
    menuNodes.push(new MenuNode(`${seperator}-seperator`, '', seperator));

    generateMenuNodesFromCategoryTags(API, menuNodes);
    generateMenuNodesFromEndpoints(API, menuNodes);
};

/**
    Creates the sub-menu from tags such as System, Login, or License
 */
const generateMenuNodesFromCategoryTags = (API: APIDoc, menuNodes: MenuNodeWithParent[]) => {
    if (Object.keys(API || {}).length) {
        API.tags.forEach(tag => {
            if (!tag.name.includes('Proprietary')) {
                const url = generateSubMenuNodeURL(tag.name);
                const tagNode: MenuNodeWithParent = new MenuNode(
                    tag.name,
                    url,
                    tag.name.slice(0, -2),
                );
                // tagNode.parentNode = menuNodes;
                menuNodes.push(tagNode);
            }
        });
    }
};

/**
    Creates menuNodes from API routes such as /rest/v1/login/sessions
    and pushes them to the subMenuNode tag that they belong to.
 */
export const generateMenuNodesFromEndpoints = (
    API: APIDoc,
    parentMenuNodes: MenuNodeWithParent[],
) => {
    Object.keys(API.paths).forEach(endpoint => {
        const endpointObj = Object.entries(API.paths[endpoint]);
        endpointObj.forEach((method: method) => {
            // Update to set since sometimes multiple tags are present
            const subMenuTags = new Set(method[1].tags);
            if (!subMenuTags.values().next().value.includes('Proprietary')) {
                const HTTPMethod = endpoint === RTSPRoute ? RTSPMethod : method[0];
                const subMenuNode = parentMenuNodes.find(node => subMenuTags.has(node.name));

                const url = generateNodeURL(endpoint, HTTPMethod);
                const APIRouteName = generateAPIRouteName(endpoint, HTTPMethod);
                const methodNode: MenuNodeWithParent = new MenuNode(
                    APIRouteName,
                    url,
                    method[1].summary || APIRouteName,
                );
                methodNode.parentNode = subMenuNode;
                subMenuNode?.nodes.push(methodNode);
            }
        });
    });
};

export const addLegacyAPIInfoNodesToMenu = (API: APIDoc, menuNodes: MenuNodeWithParent[]) => {
    if (
        !menuNodes.length ||
        (menuNodes && !['APIInformation', 'APIPreamble'].includes(menuNodes[0].name))
    ) {
        if (API?.info?.description) {
            menuNodes.unshift(
                new MenuNode('APIInformation', appendBaseAPIToolRoute('main'), 'API Information'),
            );
        }
    }
};

/**
    Creates the menu structure from the api-tool manifest. \
    Optionally takes a markdown index argument and will only add nodes that have a file present in the markdown index
 */
export const constructAPIInfoNodes = (
    docs: MarkdownItem[],
    markdown: MarkdownIndex | undefined = undefined,
): MenuNodeWithParent[] => {
    const nodes: MenuNodeWithParent[] = [];
    const convertName = (name: string) => name.toLowerCase().replace(/\s+/g, '');
    const makeNode = (name: string, hasURL = true): MenuNodeWithParent =>
        new MenuNode(
            name.replace(/\s+/g, ''),
            hasURL ? appendBaseAPIToolRoute(convertName(name)) : '',
            name,
        );
    const nodeFileExists = (name: string, markdown: MarkdownIndex | undefined = undefined) => {
        if (!markdown) {
            return true;
        }
        return !!markdown[name];
    };
    const checkNodeGoesToValidURL = (node: MenuNodeWithParent) => {
        return !!node.url || !!node.nodes.filter(node => !!node.url).length;
    };
    for (const doc of docs) {
        // Only include URL if the file exists in the MarkdownIndex (or auto-include url if we are not checking the MarkdownIndex)
        const rootNode = makeNode(doc.name, nodeFileExists(doc.name.replace(/\s+/g, ''), markdown));
        if (doc.chapters) {
            for (const chapter of doc.chapters) {
                const childNode = makeNode(
                    chapter.name,
                    nodeFileExists(chapter.name.replace(/\s+/g, ''), markdown),
                );
                rootNode.nodes.push(childNode);
                childNode.parentNode = rootNode;
            }
        }
        if (checkNodeGoesToValidURL(rootNode)) {
            nodes.push(rootNode);
        }
    }
    return nodes;
};

export const addAPIInfoNodesToMenu = (
    docs: MarkdownItem[],
    menuNodes: MenuNodeWithParent[],
    markdown: MarkdownIndex | undefined = undefined,
) => {
    const APIInfoNodes = constructAPIInfoNodes(docs, markdown);
    menuNodes.unshift(...APIInfoNodes);
};

export const queryInDescription = (path: MethodInfo, query: string) => {
    const includesCaseInsensitive = (str: string, searchStr: string) => {
        const regex = new RegExp(searchStr, 'i');
        return regex.test(str);
    };

    if (path.description && includesCaseInsensitive(path.description, query)) {
        return true;
    }
    if (path.parameters) {
        for (const parameter of path.parameters) {
            if (
                (parameter.name && includesCaseInsensitive(parameter.name, query)) ||
                (parameter.description && includesCaseInsensitive(parameter.description, query))
            ) {
                return true;
            }
        }
    }
    const schemaProperties = path.requestBody?.content['application/json']?.schema?.properties;
    if (schemaProperties) {
        for (const property of Object.keys(schemaProperties)) {
            if (
                schemaProperties[property].description &&
                includesCaseInsensitive(schemaProperties[property].description, query)
            ) {
                return true;
            }
        }
    }
    return false;
};

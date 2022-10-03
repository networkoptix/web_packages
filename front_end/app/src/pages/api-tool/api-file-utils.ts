import type { MenuNodeWithParent } from '@components/developers-menu/developers-menu-types';
import { environment } from '@environments/environment';
import { MenuNode } from '@services/menus.service.types';
import { APIDocVersion } from '@services/nx-config/base-config';

import type { APIDoc, method } from './api-tool-types';

// This file contains functions that modify API files

const RTSPRoute = '/{deviceId}';
const RTSPMethod = 'rtsp';

export const getTagModifier = (type: APIDocVersion) => {
    switch (type) {
        case 'deprecated':
            return '-D';
        case 'legacy':
            return '-L';
        case 'main':
            return '-M';
    }
};

export const generateAPIRouteName = (endpoint: string, requestType: string) => {
    return endpoint + ' - ' + requestType.toUpperCase();
};

const appendBaseAPIToolRoute = (endpoint: string) => {
    if (environment.isLocal) {
        return '/api-tool/' + endpoint;
    }
    return '/doc/developers/api-tool/' + endpoint;
};

const URLSAFEREGEX = new RegExp('[^a-zA-Z0-9/_-]');

/**
 * Example: rest/v1/users becomes rest-v1-users-get
*/
export const generateNodeURL = (endpoint :string, requestType: string) => {
    // Remove characters that aren't valid in URL, replace / with -, add request type to the end
    const modifiedEndpoint = endpoint.slice(1).toLowerCase().split(URLSAFEREGEX).join('').split('/').join('-') + '-' + requestType.toLowerCase();
    return appendBaseAPIToolRoute(modifiedEndpoint);
};

export const generateSubMenuNodeURL = (tagName: string) => {
    const cleanedTagName = tagName.toLowerCase().split(' ').join('-');
    return appendBaseAPIToolRoute(cleanedTagName);
};

/**
 * Add placeholder if description is blank
*/
const checkMethodResponseDescription = (method) => {
    if (method.responses?.default?.description === '') {
        method.responses.default.description = 'succesful operation';
    }
};

export const modifyPathTags = (api: APIDoc, type: APIDocVersion = 'main') => {
    // We have to change the tags on apis
    // so that swagger can properly differentiate tags with the same name coming from multiple different API files
    const tagModifier = getTagModifier(type);

    Object.keys(api.paths).forEach(endpoint => {
        const endpointObj = Object.entries(api.paths[endpoint]);
        endpointObj.forEach((method: any) => {
            const modifiedTag = api.paths[endpoint][method[0]].tags[0] + tagModifier;
            checkMethodResponseDescription(method[1]);
            api.paths[endpoint][method[0]].tags[0] = modifiedTag;
            // Adds the endpoint/summary itself as a tag so that swagger can filter for just the endpoint
            api.paths[endpoint][method[0]].tags.push(generateAPIRouteName(endpoint, endpoint === RTSPRoute ? RTSPMethod : method[0]));
        });
    });
    return api;
};

export const modifyTagNames = (api: APIDoc, type: APIDocVersion) => {
    api.tags.forEach((tag: any) => {
        tag.name = tag.name + getTagModifier(type);
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

export const removeProprietaryEndpoints = (api: APIDoc) => {
    Object.keys(api.paths).forEach(path => {
        const apiPath = api.paths[path];
        Object.keys(apiPath).forEach(requestType => {
            if (apiPath[requestType].description?.slice(0, 17) === '<p><b>Proprietary') {
                delete apiPath[requestType];
            }
        });
    });
    return api;
};

export const prepareSwaggerAPIDoc = (APIDoc: APIDoc) => {
    modifyPathTags(APIDoc);
    modifyTagNames(APIDoc, 'main');
    return APIDoc;
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

/**
    Adds an API file to the main developers-menu content with a seperator
 */
export const addSeperatedAPI = (API: APIDoc, menuNodes: MenuNodeWithParent[], seperator: string) => {
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
                const tagNode: MenuNodeWithParent = new MenuNode(tag.name, url, tag.name.slice(0, -2));
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
const generateMenuNodesFromEndpoints = (API: APIDoc, parentMenuNodes: MenuNodeWithParent[]) => {
    Object.keys(API.paths).forEach(endpoint => {
        const endpointObj = Object.entries(API.paths[endpoint]);
        endpointObj.forEach((method: method) => {
            const subMenuTag = method[1].tags[0];
            if (!subMenuTag.includes('Proprietary')) {
                const HTTPMethod = endpoint === RTSPRoute ? RTSPMethod : method[0];
                const subMenuNode = parentMenuNodes.find(node => node.name === subMenuTag);

                const url = generateNodeURL(endpoint, HTTPMethod);
                const APIRouteName = generateAPIRouteName(endpoint, HTTPMethod);
                const methodNode: MenuNodeWithParent = new MenuNode(APIRouteName, url, method[1].summary || APIRouteName);
                methodNode.parentNode = subMenuNode;
                subMenuNode?.nodes.push(methodNode);
            }
        });
    });
};

export const addAPIInfoNodesToMenu = (API: APIDoc, menuNodes: MenuNodeWithParent[], restAPIInfo: boolean) => {
    if (restAPIInfo) {
        menuNodes.unshift(new MenuNode('api_changelog', appendBaseAPIToolRoute('changelog'), 'API Changelog'));
        menuNodes.unshift(new MenuNode('api_information', appendBaseAPIToolRoute('main'), 'API Information'));
        return;
    }

    if (API?.info?.description) {
        menuNodes.unshift(new MenuNode('api_information_legacy', appendBaseAPIToolRoute('main'), 'API Information'));
    }
};

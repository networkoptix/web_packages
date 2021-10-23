import { MenuNodeWithParent } from '@components/developers-menu/developers-menu.component';
import { MenuNode } from '@services/menus.service.types';
import type { APIDocVersion } from '../../services/nx-config/base-config';
import type { APIDoc } from './api-tool-types';

// This file contains functions that modify API files

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

/**
 * Also handles scenarios where there are multiple requests to the same path but with a different request type
 * (GET, POST ... etc)
*/
export const getAPIRouteName = (endpoint: string, includeTypeOfRequest: boolean, requestType: string) => {
    if (includeTypeOfRequest) {
        return endpoint + ' - ' + requestType.toUpperCase();
    }
    return endpoint;
};

export const modifyPathTags = (api: APIDoc, type: APIDocVersion = 'main') => {
    // We have to change the tags on apis
    // so that swagger can properly differentiate tags with the same name coming from multiple different API files
    const tagModifier = getTagModifier(type);

    Object.keys(api.paths).forEach(endpoint => {
        const endpointObj = Object.entries(api.paths[endpoint]);
        const includeTypeOfRequest = endpointObj.length > 1;
        endpointObj.forEach((method: any) => {
            const modifiedTag = api.paths[endpoint][method[0]].tags[0] + tagModifier;
            api.paths[endpoint][method[0]].tags[0] = modifiedTag;
            // Adds the endpoint/summary itself as a tag so that swagger can filter for just the endpoint
            api.paths[endpoint][method[0]].tags.push(getAPIRouteName(endpoint, includeTypeOfRequest, method[0]));
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
export const createMenuContent = (api: APIDoc) => {
    const menuContent: MenuNodeWithParent[] = [];
    menuContent.push(new MenuNode('api_information', '', 'API Information'));

    if (Object.keys(api || {}).length) {
        api.tags.forEach(tag => {
            menuContent.push(new MenuNode(tag.name, '', tag.name.slice(0, -2)));
        });
    }

    let tag: MenuNodeWithParent;
    Object.keys(api.paths).forEach(endpoint => {
        const endpointObj = Object.entries(api.paths[endpoint]);
        const includeTypeOfRequest = endpointObj.length > 1;
        endpointObj.forEach(method => {
            tag = menuContent.find((node) => {
                return node.name === method[1].tags[0];
            });

            const apiRouteName = getAPIRouteName(endpoint, includeTypeOfRequest, method[0]);
            const methodNode: MenuNodeWithParent = new MenuNode(apiRouteName, '', method[1].summary || apiRouteName);
            methodNode.parentNode = tag;
            tag.nodes.push(methodNode);
        });
    });
    return menuContent;
};

/**
    Adds an API file to the developers-menu nodes as a node
 */
export const addSubMenuAPI = (legacyApi: APIDoc, baseMenuContent: MenuNodeWithParent[], type: 'legacy' | 'deprecated') => {
    const title = type[0].toUpperCase() + type.slice(1);
    const apiContent = baseMenuContent;

    apiContent.push(new MenuNode(type, '', title));

    const subAPIMenuNode: MenuNodeWithParent = apiContent[apiContent.length - 1];

    if (Object.keys(legacyApi || {}).length) {
        legacyApi.tags.forEach(tag => {
            if (!tag.name.includes('Proprietary')) {
                const tagNode: MenuNodeWithParent = new MenuNode(tag.name, '', tag.name.slice(0, -2));
                tagNode.parentNode = subAPIMenuNode;
                subAPIMenuNode.nodes.push(tagNode);
            }
        });
    }

    let tag: MenuNodeWithParent;
    Object.keys(legacyApi.paths).forEach(endpoint => {
        const endpointObj = Object.entries(legacyApi.paths[endpoint]);
        const includeTypeOfRequest = endpointObj.length > 1;
        endpointObj.forEach((method: any) => {
            tag = subAPIMenuNode.nodes.find(node => node.name === method[1].tags[0]);
            const methodName = getAPIRouteName(endpoint, includeTypeOfRequest, method[0]);
            const methodNode: MenuNodeWithParent = new MenuNode(methodName, '', method[1].summary || methodName);
            methodNode.parentNode = tag;
            tag.nodes.push(methodNode);
        });
    });
};

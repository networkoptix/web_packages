import type { APIDocVersion } from '../../services/nx-config/base-config';
import type { APIDoc, MenuContent } from './api-tool-types';

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
 * Handles legacy API scenarios where there are multiple requests to the same path but with a different request type
 * (GET, POST ... etc)
*/
export const getLegacyMenuText = (endpoint: string, includeTypeOfRequest: boolean, requestType: string) => {
    if (includeTypeOfRequest) {
        return endpoint + ' - ' + requestType.toUpperCase();
    }
    return endpoint;
};

export const modifyPathTags = (api: APIDoc, type: APIDocVersion = 'main') => {
    // We have to change the tags on apis so that swagger can properly differentiate tags with the same name coming from multiple different API files
    const tagModifier = getTagModifier(type);

    Object.keys(api.paths).forEach(endpoint => {
        const endpointObj = Object.entries(api.paths[endpoint]);
        const includeTypeOfRequest = endpointObj.length > 1;
        endpointObj.forEach((method: any) => {
            const modifiedTag = api.paths[endpoint][method[0]].tags[0] + tagModifier;
            api.paths[endpoint][method[0]].tags[0] = modifiedTag;
            // Adds the endpoint/summary itself as a tag so that swagger can filter for just the endpoint
            api.paths[endpoint][method[0]].tags.push(method[1].summary || getLegacyMenuText(endpoint, includeTypeOfRequest, method[0]));
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
    Creates the left-menu content from an API file
 */
export const createMenuContent = (response: APIDoc): MenuContent => {
    const _menuContent = {
        pageDescriptions: {
            api_information: {
                title       : response.info?.title || 'API Information',
                description : response.info?.description || ''
            }
        },
        searchable             : false,
        selectedSection        : 'api_information', // updated by selectedSectionSubject
        selectedSubSection     : '', // updated by selectedSubSectionSubject
        selectedDetailsSection : '',
        system                 : {}, // updated by getSystemInfo
        base                   : '', // no base - no navigation
        level1                 : [
            {
                id     : 'api_information',
                svg    : '',
                label  : 'API Information',
                path   : '',
                level2 : [],
                level3 : []
            }
        ]
    };

    if (Object.keys(response || {}).length) {
        response.tags.forEach(tag => {
            const categoryNode = {
                id     : tag.name,
                svg    : 'arrow_expand',
                label  : tag.name.slice(0, -2),
                path   : '',
                level2 : [],
                level3 : []
            };
            _menuContent.level1.push(categoryNode);
            _menuContent.searchable = true;
        });

        let categoryNode:any = [];

        Object.keys(response.paths).forEach(endpoint => {
            const endpointObj = Object.entries(response.paths[endpoint]);
            const includeTypeOfRequest = endpointObj.length > 1;
            endpointObj.forEach((method: any) => {
                categoryNode = _menuContent.level1.find((node) => {
                    return node.id === method[1].tags[0];
                });
                categoryNode.level3.push({
                    additionalLabel : '',
                    id              : method[1].summary || getLegacyMenuText(endpoint, includeTypeOfRequest, method[0]),
                    isEnabled       : true,
                    label           : method[1].summary || getLegacyMenuText(endpoint, includeTypeOfRequest, method[0]),
                    path            : '',
                    svgIcon         : ''
                });
            });
        });
    }

    _menuContent.level1.forEach((level1) => {
        level1.level3.sort((a, b) => {
            const fa = a.label.toLowerCase();
            const fb = b.label.toLowerCase();

            if (fa < fb) {
                return -1;
            }
            if (fa > fb) {
                return 1;
            }
            return 0;
        });
    });

    return _menuContent;
};

/**
    Adds an API file to the left-menu content as a sub menu.
 */
export const addSubMenuApi = (legacyApi: APIDoc, baseMenuContent: MenuContent, type: 'legacy' | 'deprecated') => {
    const title = type[0].toUpperCase() + type.slice(1);
    const apiContent = baseMenuContent;
    apiContent.level1.push({
        id     : type,
        svg    : 'arrow_expand',
        label  : title,
        path   : '',
        level2 : [],
        level3 : []
    });

    baseMenuContent.pageDescriptions[type] = {
        title       : legacyApi.info?.title || `${type.toUpperCase()} API Information`,
        description : legacyApi.info?.description || ''
    };

    const _subMenuContent = apiContent.level1.find(item => item.id === type);

    if (Object.keys(legacyApi || {}).length) {
        legacyApi.tags.forEach(tag => {
            if (!tag.name.includes('Proprietary')) {
                const categoryNode = {
                    id     : tag.name,
                    svg    : 'arrow_expand',
                    label  : tag.name.slice(0, -2),
                    path   : '',
                    level2 : [],
                    level3 : []
                };
                _subMenuContent.level2.push(categoryNode);
                _subMenuContent.searchable = true;
            }
        });

        let categoryNode:any = [];
        Object.keys(legacyApi.paths).forEach(endpoint => {
            const endpointObj = Object.entries(legacyApi.paths[endpoint]);
            const includeTypeOfRequest = endpointObj.length > 1;
            endpointObj.forEach((method: any) => {
                categoryNode = _subMenuContent.level2.find((node) => {
                    return node.id === method[1].tags[0];
                });
                categoryNode.level3.push({
                    additionalLabel : '',
                    id              : method[1].summary || getLegacyMenuText(endpoint, includeTypeOfRequest, method[0]),
                    isEnabled       : true,
                    label           : method[1].summary || getLegacyMenuText(endpoint, includeTypeOfRequest, method[0]),
                    path            : '',
                    svgIcon         : ''
                });
            });
        });
    }
};

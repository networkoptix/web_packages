export function trimID(id) {
    if (!id || !id.length || typeof id !== 'string') { return id; }
    if (id[0] === '{' && id[id.length - 1] === '}') {
        return id.slice(1, id.length - 1);
    } else {
        return id;
    }
}

export function trimIDs(o) {
    const result = { ...o };

    const idFields = [
        'id',
        'parentId',
        'preferredServerId',
        'authKey',
        'metadataStorageId',
        'typeId'
    ];

    idFields.map(idField => {
        if (idField in o) {
            result[idField] = trimID(o[idField]);
        }
    });
    return result;
}

export function tryToParseJSON(v) {
    try {
        return JSON.parse(v);
    } catch {
        return trimID(v);
    }
}

// <added by @gbezyuk for watch component>
export function trim_id (id) {
    if (!id || !id.length || typeof id !== "string")
        return id
    if (id[0] === '{' && id[id.length - 1] === '}') {
        return id.slice(1, id.length - 1)
    } else {
        return id
    }
}

export function trim_ids (o) {
    let result = { ...o }
    
    let id_fields = [
        'id',
        'parentId',
        'preferredServerId',
        'authKey',
        'metadataStorageId',
        'typeId'
    ]
    
    id_fields.map(id_field => {
        if (id_field in o) {
            result[id_field] = trim_id(o[id_field])
        }
    })
    return result
}

export function try_to_parse_JSON (v) {
    try {
        return JSON.parse(v)
    } catch {
        // if it's not JSON, consider it to be string anyway
        // console.log('JSON parsing failed', v)
        
        // let's clean {ids} here, too, just in case
        return trim_id(v)
    }
}
// </added by @gbezyuk for watch component>
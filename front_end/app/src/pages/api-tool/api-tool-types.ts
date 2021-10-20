// Could make this type more accurate, but have to watch out for different/older versions of the API
export interface APIDoc {
    info? : {
        title: string,
        description: string,
        version : string
    }
    tags  : {
                name: string,
                description?: string,
                [key:string]: any
            }[],
    paths : {
                [key: string]: {
                    [key in requestTypes]: {
                        tags: string[],
                        parameters: [{[key:string]: any}],
                        [key: string] : any
                    }
                }
            },
    servers?: { url: string}[]
}

export type placeHolderSelections = 'api_information' | 'legacy' | 'deprecated'

export interface Level1Item {
  searchable? : boolean,
  id          : string,
  svg         : string,
  label       : string,
  path        : string,
  level2      : any[],
  level3      : any[]
}
export interface MenuContent {
  pageDescriptions       : {
      [API: string]: {
          title: string,
          description: string
      }
  },
  searchable             : boolean,
  selectedSection        : string,
  selectedSubSection     : string, // updated by selectedSubSectionSubject
  selectedDetailsSection : string,
  system                 : object,
  base                   : string, // no base - no navigation
  level1                 : Level1Item[]
}

export interface SystemDropdownItem {
    name: string,
    value: string
}

export interface ServerDropdownItem {
    value        : string,
    name         : string,
    apiDocFull   : APIDoc,
    incompatible : boolean
}

export enum requestTypes {
    GET = 'get',
    POST = 'post',
    TRACE = 'trace',
    PUT = 'put',
    DELETE = 'delete',
    PATCH = 'patch',
    OPTIONS = 'options'
}

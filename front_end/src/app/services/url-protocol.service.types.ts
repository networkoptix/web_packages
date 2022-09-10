export interface LinkSettings {
    native?: boolean,
    from?: string,
    context?: {},
    command?: string,
    systemId?: string,
    action?: {},
    actionParameters?: {},
    auth?: boolean | string | undefined,
    code?: string | undefined,
    useOauth?: boolean
}

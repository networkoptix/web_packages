export enum ChildRoutes {
    CAMERAS = 'cameras',
    SERVERS = 'servers',
    USERS = 'users',
    VIEW = 'view',
    HEALTH = 'health',
}

export type RouteResolverParams =
    | { systemId?: string; cameraId: string }
    | { systemId?: string; serverId: string }
    | { systemId?: string; userId: string }
    | { systemId?: string; childRoute?: ChildRoutes };

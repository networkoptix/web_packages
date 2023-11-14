This folder is for types from System API requests, before any processing.

Types from REST endpoints should go into the file that matches the path after the version in the REST APIs URL (e.g. `devices.types.ts` contains types from requests made to `/rest/v(N)/devices/*`). Otherwise, types should go into the closest logical match (e.g. `/ec2/getMediaServersEx` is the predecessor of `/rest/v(N)/servers`, so the type for it should go into `servers.types.ts`).

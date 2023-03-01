import { environment } from '@environments/environment';
import { nxConfig } from '@services/nx-config/config';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';

export const jsonRpcEnabled = (target: NxSystemRestAPI): boolean => nxConfig.featureFlags.useJsonRpc && target.version >= NxSystemRestAPI2.VERSION && !!(target.authGet || environment.isLocal);

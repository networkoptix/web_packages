import { ICamera } from './ICamera';

export interface IMediaServer {
    id: string;
    name: string;
    status: string;
    networkAddresses: string;
    ip?: string;
    port?: string;
    url?: string;
    cameras: Array<ICamera>;
}

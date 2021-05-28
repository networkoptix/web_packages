import ICamera from './ICamera';

export interface IMediaServer {
    id: string,
    name: string,
    status: string,
    networkAddresses: string,
    ip?: string,
    port?: string,
    cameras: Array<ICamera>,
}

export default IMediaServer;

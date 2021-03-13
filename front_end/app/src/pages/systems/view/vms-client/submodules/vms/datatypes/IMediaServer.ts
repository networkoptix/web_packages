import ICamera from './ICamera'


export interface IMediaServer {
  id: string,
  name: string,
  url: string,
  cameras: Array<ICamera>,
}

export default IMediaServer

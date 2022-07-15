import type { Process } from '@services/process.service/process';

interface RibbonProcessAction {
    type: 'process-button',
    text: string,
    value: Process,
    external?: boolean
}

interface RibbonLinkAction {
  type: 'link',
  text: string,
  value: string,
  external?: boolean
}

export type RibbonAction = RibbonProcessAction | RibbonLinkAction;

import type { Process } from '@services/process.service/process';

export interface RibbonAction {
    type: 'link' | 'process-button',
    text: string,
    value: string | Process,
    external?: boolean
}

export interface RibbonActionInput extends Omit<RibbonAction, 'text'> {
  text: string | Function;
}

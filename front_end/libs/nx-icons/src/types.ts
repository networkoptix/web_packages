import * as nxIcons from './lib/generated';
import { NxIconEnum } from './lib/generated/icons/my-icons.model';

export type NxIconsBase = typeof nxIcons;

export type NxIcons = NxIconsBase[keyof NxIconsBase];

export type NxIconNames = NxIconsBase[keyof NxIconsBase]['name'];

export type NxIconOrName = NxIcons | NxIconNames;

export { NxIconEnum };

export const enumValues: `${NxIconEnum}`[] = Object.values(NxIconEnum)
    .filter(x => typeof x === 'string')
    .sort((a: string, b: string) => a.localeCompare(b, navigator.language, { numeric: true }));

export type SvgTransform = (svg: string) => string;

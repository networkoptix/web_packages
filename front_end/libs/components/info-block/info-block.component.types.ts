export type InfoBlockSizeType = 'compact' | 'full';

export enum InfoBlockSize {
    COMPACT = 'compact',
    FULL = 'full',
}

export enum InfoLineStyle {
    CONDENSED = 'condensed',
    WIDE = 'wide',
}

export enum InfoDetailClass {
    ERROR = 'error',
    WARNING = 'warning',
}

export class InfoBlockLine<Name = string, Value = string> {
    constructor(
        public name: Name,
        public value: Value,
        public customClass?: InfoDetailClass,
        public icon?: string,
        public show: boolean = true,
        public tooltip?: string,
    ) {}
}

export class InfoBlockSection<Heading = string> {
    constructor(
        public lines: InfoBlockLine[],
        public heading?: Heading,
        public maxParamWidth?: number,
    ) {}
}

export type InfoBlockSections = InfoBlockSection[];

export type InfoBlockColumns = InfoBlockSections[];

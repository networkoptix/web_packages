import { TextDecoder, TextEncoder } from 'util';

import ResizeObserver from 'resize-observer-polyfill';

class DataTransfer {
    value = '';

    setData(_: string, value: string): void {
        this.value = value;
    }
    getData(_: string): string {
        return this.value;
    }
}

class ClipboardEvent {
    clipboardData: DataTransfer;

    preventDefault(): void {}

    getData(format: string): string {
        return this.clipboardData.getData(format);
    }

    constructor(type: string, eventInitDict: { clipboardData: DataTransfer }) {
        this.clipboardData = eventInitDict.clipboardData;
    }
}

interface IIntersectionObserverEntry {
    isIntersecting: boolean;
}

type IntersectionObserverCallback = (
    entries: IIntersectionObserverEntry[],
    observer: IntersectionObserver,
) => void;

class IntersectionObserver {
    callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
    }

    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

export const patchGlobals = (): unknown =>
    Object.assign(global, {
        TextDecoder,
        TextEncoder,
        ResizeObserver,
        DataTransfer,
        ClipboardEvent,
        IntersectionObserver,
    });

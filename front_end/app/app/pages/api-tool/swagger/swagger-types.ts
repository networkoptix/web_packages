import { ComponentRef } from '@angular/core';

export interface componentMap {
    [uuid: string]: ComponentRef<unknown>
}

export interface textareaMap {
    [uuid: string]: string
}

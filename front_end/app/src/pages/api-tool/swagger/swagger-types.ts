import { ComponentRef } from '@angular/core';

export interface componentMap {
    [uuid: string]: ComponentRef<any>
}

export interface textareaMap {
    [uuid: string]: string
}

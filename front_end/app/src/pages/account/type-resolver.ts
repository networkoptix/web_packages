import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

@Injectable()
export class TypeResolver implements Resolve<any> {
    constructor() {}

    resolve() {
        return 'password';
    }
}

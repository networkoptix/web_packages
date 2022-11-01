import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

@Injectable()
export class TypeResolver implements Resolve<string> {
    resolve(): string {
        return 'password';
    }
}

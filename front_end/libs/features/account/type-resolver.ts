import { Injectable } from '@angular/core';

@Injectable()
export class TypeResolver {
    resolve(): string {
        return 'password';
    }
}

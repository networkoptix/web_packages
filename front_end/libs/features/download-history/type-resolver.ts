import { Injectable } from '@angular/core';
import { Resolve, Router } from '@angular/router';
import { EMPTY as empty } from 'rxjs';

@Injectable()
export class TypeResolver implements Resolve<never> {
    constructor(private router: Router) {}

    resolve(): typeof empty {
        this.router
            .navigate(['/downloads/releases'])
            .catch(error => {
                console.error(error);
            });
        return empty;
    }
}

import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';
import { EMPTY as empty } from 'rxjs';

export const TypeResolver: ResolveFn<typeof empty> = () => {
    inject(Router)
        .navigate(['/downloads/releases'])
        .catch(error => {
            console.error(error);
        });
    return empty;
};

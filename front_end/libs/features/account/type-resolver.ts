import { ResolveFn } from '@angular/router';

export const TabResolver: ResolveFn<string> = (): string => {
    return 'password';
};

import { TestBed } from '@angular/core/testing';

import { NxThemeProviderService } from './theme-provider.service';

describe('ThemeProviderService', () => {
    let service: NxThemeProviderService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(NxThemeProviderService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});

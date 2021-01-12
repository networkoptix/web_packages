import { waitForAsync, TestBed } from '@angular/core/testing';
import { describe, expect, jest, beforeEach, it }  from '@jest/globals';

import { NxNamedService }                  from './test';
import { NxConfigService }                 from '@services/nx-config';
import { nxConfig }                        from '@services/nx-config/config';
import { NxLanguageProviderService }       from '@services/nx-language-provider';
import { NxProcessService }                from '@services/process.service';

describe('Test Suite Name', () => {
    let namedService: NxNamedService;
    const translateMock = { translations: {
        pageTitles: {
            systems: () => "Systems"
        }
    }};
    const configMock = { getConfig: () => nxConfig };
    const potentialMock = {
        getConfig: jest.fn(),
        methods: jest.fn(),
        methodWithParameters: jest.fn((param1, param2) => 'returnResultUsingParams'),
        classVariables: 'put value here'
    }

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            providers    : [
                NxNamedService,
                { provide: NxLanguageProviderService, useValue: translateMock },
                // if cloud variables needed, must be added in
                // CONFIG.path = 'testValue' in the test itself or the .then after compileComponents below works 
                { provide: NxConfigService, useValue: configMock },
                // must add everything in constructor here, try this:
                // NxProcessService
                // use this if service not needed during test
                // { provide: NxProcessService, useValue: {} }
                // use this if service needed during test
                { provide: NxProcessService, useValue: potentialMock }

            ]
        });
        namedService = TestBed.inject(NxNamedService);
    }));

    it('should create the component', () => {
        expect(namedService).toBeTruthy();
    });

    it('should use NxNamedService for static methods', () => {
        expect(NxNamedService.staticMethod).toBe('whatever it should be');
    });
});

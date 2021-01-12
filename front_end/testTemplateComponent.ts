import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement }                            from '@angular/core';
import { describe, expect, jest, beforeEach, it }  from '@jest/globals';

import { NxImportedComponent }             from './test';
import { NxConfigService }                 from '@services/nx-config';
import { nxConfig }                        from '@services/nx-config/config';
import { NxLanguageProviderService }       from '@services/nx-language-provider';
import { NxProcessService }                from '@services/process.service';

describe('Test Suite Name', () => {
    let component: NxImportedComponent;
    let fixture: ComponentFixture<NxImportedComponent>;
    let el: DebugElement;
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
            declarations : [NxImportedComponent],
            imports      : [],
            providers    : [
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
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxImportedComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should call getConfig', () => {
        expect(potentialMock.getConfig.mock.calls.length).toBe(4);
    });
});

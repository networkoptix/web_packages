import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement, NgModule }                  from '@angular/core';
import { describe, expect, jest, beforeEach, it }  from '@jest/globals';
import { HttpClientTestingModule }                 from '@angular/common/http/testing';
import { TranslateModule }                         from '@ngx-translate/core';
import { By }                                      from '@angular/platform-browser';
import { ActivatedRoute }                          from '@angular/router';
import { FormsModule, ReactiveFormsModule }        from '@angular/forms';
import { AngularSvgIconModule }                    from 'angular-svg-icon';
import { CommonModule }                            from '@angular/common';
import { of }                                      from 'rxjs';

import { NxAuthorizeComponent }      from './authorize.component';
import { NxAuthorizeEmailComponent } from './email/email.component';
import { NxConfigService }           from '@services/nx-config';
import { nxConfig }                  from '@services/nx-config/config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService }          from '@services/process.service';
import { NxCloudApiService }         from '@services/nx-cloud-api';
import { ComponentsModule }          from '@components/components.module';

@NgModule({
    imports: [ TranslateModule.forRoot() ],
    exports: [ TranslateModule ]
})
class TranslateTestingModule {}

describe('OAuth Test Suite', () => {
    let component: NxAuthorizeComponent;
    let fixture: ComponentFixture<NxAuthorizeComponent>;
    let el: DebugElement;
    const translateMock = { translations: {
        authorize: {
            loginCloudHeader: () => "Log in to %CLOUD_NAME%"
        }
    }};
    nxConfig.dynamicMenus.authorizeFooter = [
        {
            name: 'About %CLOUD_NAME% Cloud',
            url: '/content/about',
            asset_id: null,
            authentication: null,
            display_name: 'About %CLOUD_NAME% Cloud',
            icon: '',
            new_window: false,
            next_item: false,
            breadcrumbs: null,
            related_asset_ids: []
        },
        {
            name: 'Terms',
            url: '/content/eula',
            asset_id: null,
            authentication: null,
            display_name: 'Terms',
            icon: '',
            new_window: false,
            next_item: false,
            breadcrumbs: null,
            related_asset_ids: []
        },
        {
            name: 'Privacy Policy',
            url: 'https://www.networkoptix.com/privacy-policy',
            asset_id: null,
            authentication: null,
            display_name: 'Privacy Policy',
            icon: '',
            new_window: false,
            next_item: false,
            breadcrumbs: null,
            related_asset_ids: []
        }
    ]
    const configMock = { getConfig: () => nxConfig };
    const processMock = {
        createProcess: jest.fn(),
        methods: jest.fn(),
        methodWithParameters: jest.fn((param1, param2) => 'returnResultUsingParams'),
        classVariables: 'put value here'
    };
    const routeMock = {
        queryParams: of({
            client_id: 'someId',
            grant_type: 'password',
            response_type: 'code',
            scope: 'anythingElse'
        })
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations : [NxAuthorizeComponent, NxAuthorizeEmailComponent],
            imports      : [
                CommonModule, ReactiveFormsModule, FormsModule, 
                AngularSvgIconModule.forRoot(), HttpClientTestingModule,
                TranslateTestingModule, ComponentsModule
            ],
            providers    : [
                { provide: NxConfigService, useValue: configMock },
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: ActivatedRoute, useValue: routeMock },
                { provide: NxCloudApiService, useValue: {} },
                { provide: NxProcessService, useValue: processMock }
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxAuthorizeComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        expect(component).toBeTruthy();
    });

    it('should have 3 footer items', () => {
        fixture.detectChanges();
        expect(component.footerItems.length).toBe(3);
    });

    it('should set up default states', () => {
        fixture.detectChanges();
        expect(component.clientType).toBe('loginToCloud');
        expect(component.currentState).toBe('email');
        expect(component.initialData).toStrictEqual({
            client_id: 'someId',
            grant_type: 'password',
            response_type: 'code',
            scope: 'anythingElse'
        });
    });

    it('should load email component', () => {
        fixture.detectChanges();
        const emailForm = el.queryAll(By.css('form'));
        expect(emailForm.length).toBe(1);
        const emailHeader = el.nativeElement.querySelector('h3');
        expect(emailHeader.innerHTML).toBe(component.LANG.authorize.loginCloudHeader());
        const createButtonText = el.nativeElement.querySelector('span');
        expect(createButtonText.innerHTML).toBe('Create Account');
    });

    it('should not load password component', () => {
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('label');
        expect(labels[0].innerHTML).not.toBe('Password');
        expect(labels[0].innerHTML).toBe('Email');
    });
});

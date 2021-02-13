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

import { AuthorizeState, NxAuthorizeComponent } from './authorize.component';
import { NxAuthorizeEmailComponent }            from './email/email.component';
import { NxAuthorizePasswordComponent }         from './password/password.component';
import { NxAuthorizeCreateAccountComponent }    from './create-account/create-account.component';
import { NxAuthorizeActivateAccountComponent }  from './activate-account/activate-account.component';
import { NxAuthorizeConfirmationComponent }     from './confirmation/confirmation.component';

import { NxConfigService }           from '@services/nx-config';
import { nxConfig }                  from '@services/nx-config/config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService }          from '@services/process.service';
import { NxCloudApiService }         from '@services/nx-cloud-api';
import { ComponentsModule }          from '@components/components.module';

@NgModule({
    imports : [TranslateModule.forRoot()],
    exports : [TranslateModule]
})
class TranslateTestingModule {}

describe('OAuth Test Suite', () => {
    let component: NxAuthorizeComponent;
    let fixture: ComponentFixture<NxAuthorizeComponent>;
    let el: DebugElement;
    const translateMock = {
        translations: {
            authorize: {
                loginCloudHeader    : () => 'Log in to %CLOUD_NAME%',
                activateHeader      : () => 'Activate %CLOUD_NAME% Account',
                createdText         : () => 'Account Created!',
                createdAdditional   : () => '<p class=\"mb-2\">Confirmation message with the activation link is sent to {accountEmail}.</p><p>Please, activate the account and return here to finish the process.</p>',
                activatedText       : () => 'Account Activated!',
                activatedAdditional : () => '<p>Now you may continue to log in to %CLOUD_NAME% here or elsewhere</p>',
                connectedText       : () => 'System connected to %CLOUD_NAME%'
            }
        }
    };
    nxConfig.dynamicMenus.authorizeFooter = [
        {
            name              : 'About %CLOUD_NAME% Cloud',
            url               : '/content/about',
            asset_id          : null,
            authentication    : null,
            display_name      : 'About %CLOUD_NAME% Cloud',
            icon              : '',
            new_window        : false,
            next_item         : false,
            breadcrumbs       : null,
            related_asset_ids : []
        },
        {
            name              : 'Terms',
            url               : '/content/eula',
            asset_id          : null,
            authentication    : null,
            display_name      : 'Terms',
            icon              : '',
            new_window        : false,
            next_item         : false,
            breadcrumbs       : null,
            related_asset_ids : []
        },
        {
            name              : 'Privacy Policy',
            url               : 'https://www.networkoptix.com/privacy-policy',
            asset_id          : null,
            authentication    : null,
            display_name      : 'Privacy Policy',
            icon              : '',
            new_window        : false,
            next_item         : false,
            breadcrumbs       : null,
            related_asset_ids : []
        }
    ];
    const configMock = { getConfig: () => nxConfig };
    const processMock = {
        createProcess        : jest.fn(),
        methods              : jest.fn(),
        methodWithParameters : jest.fn((param1, param2) => 'returnResultUsingParams'),
        classVariables       : 'put value here'
    };
    const routeMock = {
        queryParams: of({
            client_id     : 'someId',
            grant_type    : 'password',
            response_type : 'code',
            scope         : 'anythingElse'
        })
    };

    const cloudMock = {
        getCommonPasswords: () => of()
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                NxAuthorizeComponent,
                NxAuthorizeEmailComponent,
                NxAuthorizePasswordComponent,
                NxAuthorizeCreateAccountComponent,
                NxAuthorizeActivateAccountComponent,
                NxAuthorizeConfirmationComponent
            ],
            imports: [
                CommonModule, ReactiveFormsModule, FormsModule,
                AngularSvgIconModule.forRoot(), HttpClientTestingModule,
                TranslateTestingModule, ComponentsModule
            ],
            providers: [
                { provide: NxConfigService, useValue: configMock },
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: ActivatedRoute, useValue: routeMock },
                { provide: NxCloudApiService, useValue: cloudMock },
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
            client_id     : 'someId',
            grant_type    : 'password',
            response_type : 'code',
            scope         : 'anythingElse'
        });
    });

    it('should load email component', () => {
        fixture.detectChanges();
        const emailLabel = el.nativeElement.querySelectorAll('label');
        expect(emailLabel[0].innerHTML).toBe('Email');
        const emailHeader = el.nativeElement.querySelector('h3');
        expect(emailHeader.innerHTML).toBe(component.LANG.authorize.loginCloudHeader());
        const createButtonText = el.nativeElement.querySelector('span');
        expect(createButtonText.innerHTML).toBe('Create Account');
        component.CONFIG.isLocal = true;
        fixture.detectChanges();
        const loginLabel = el.nativeElement.querySelectorAll('label');
        expect(loginLabel[0].innerHTML).toBe('Login');
    });

    it('should load password component', () => {
        component.loginEmail = 'password@example.co';
        component.CONFIG.isLocal = false;
        fixture.detectChanges();
        component.currentState = AuthorizeState.password;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('label');
        expect(labels[0].innerHTML).toBe('Password');
        const passwordHeader = el.nativeElement.querySelector('h3');
        expect(passwordHeader.innerHTML).toBe(component.LANG.authorize.loginCloudHeader());
        const spans = el.nativeElement.querySelectorAll('span');
        expect(spans[0].innerHTML).toBe('As');
        expect(spans[1].innerHTML).toBe('password@example.co');
        expect(spans[3].innerHTML).toBe('Forgot Password?');
        expect(spans[4].innerHTML).toBe('Back');
        expect(spans.length).toBe(5);
    });

    it('should load createAccount component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.create;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('label');
        expect(labels[0].innerHTML).toBe('Email');
        expect(labels[1].innerHTML).toBe('First Name');
        expect(labels[2].innerHTML).toBe('Last Name');
        expect(labels[3].innerHTML).toBe('Password');
        expect(labels.length).toBe(5);
        const createHeader = el.nativeElement.querySelector('h3');
        expect(createHeader.innerHTML).toBe(component.LANG.authorize.loginCloudHeader());
        const spans = el.nativeElement.querySelectorAll('span');
        expect(spans[3].innerHTML).toBe('Log In');
        expect(spans[4].innerHTML).toBe('Back');
        expect(spans.length).toBe(5);
        component.existingEmail = 'create@example.co';
        fixture.detectChanges();
        const existingEmailSpans = el.nativeElement.querySelectorAll('span');
        expect(existingEmailSpans[0].innerHTML).toBe('For');
        expect(existingEmailSpans[1].innerHTML).toBe('create@example.co');
        expect(existingEmailSpans.length).toBe(7);
    });

    it('should load activateAccount component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.activate;
        // activated = false; fromEmail = false;
        fixture.detectChanges();
        let activateHeaders = el.nativeElement.querySelectorAll('h3');
        expect(activateHeaders.length).toBe(2);
        expect(activateHeaders[0].innerHTML).toBe(component.LANG.authorize.activateHeader());
        expect(activateHeaders[1].innerHTML).toBe(component.LANG.authorize.createdText());
        let contentMessage = el.queryAll(By.css('.content-message'));
        expect(contentMessage.length).toBe(1);
        expect(contentMessage[0].nativeElement.innerHTML).toBe(component.LANG.authorize.createdAdditional());
        let spans = el.nativeElement.querySelectorAll('span');
        expect(spans[0].innerHTML).toBe('Log In');
        expect(spans[1].innerHTML).toBe('Back');
        expect(spans.length).toBe(2);
        // activated = true; fromEmail = false;
        component.activated = true;
        fixture.detectChanges();
        activateHeaders = el.nativeElement.querySelectorAll('h3');
        expect(activateHeaders.length).toBe(1);
        expect(activateHeaders[0].innerHTML).toBe(component.LANG.authorize.activatedText());
        contentMessage = el.queryAll(By.css('.content-message'));
        expect(contentMessage.length).toBe(1);
        expect(contentMessage[0].nativeElement.innerHTML).toBeFalsy();
        spans = el.nativeElement.querySelectorAll('span');
        expect(spans.length).toBe(2);
        // activated = true; fromEmail = true;
        component.fromEmail = true;
        fixture.detectChanges();
        contentMessage = el.queryAll(By.css('.content-message'));
        expect(contentMessage.length).toBe(1);
        expect(contentMessage[0].nativeElement.innerHTML).toBe(component.LANG.authorize.activatedAdditional());
        spans = el.nativeElement.querySelectorAll('span');
        expect(spans.length).toBe(0);
    });

    it('should load confirmation component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.confirm;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('button');
        expect(labels[0].innerHTML).toBe('OK');
        const emailHeader = el.nativeElement.querySelector('h3');
        expect(emailHeader.innerHTML).toBe(component.LANG.authorize.connectedText());
    });
});

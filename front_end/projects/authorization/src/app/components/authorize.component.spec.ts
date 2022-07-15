import { CommonModule } from '@angular/common';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { DebugElement, ElementRef } from '@angular/core';
import {
    waitForAsync,
    ComponentFixture,
    TestBed,
    tick,
    fakeAsync,
} from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MockProvider } from 'ng-mocks';
import { DeviceDetectorService } from 'ngx-device-detector';
import { LocalStorageService } from 'ngx-webstorage';
import { of } from 'rxjs';

import { SharedComponentsModule } from '@components/shared-components.module';
import { DirectivesModule } from '@directives/directives.module';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import { NxMenusService } from '@services/menus.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { NxThemeService } from '@services/theme.service';
import { WINDOW } from '@services/window-provider';
import { PipesModule } from '@src/pipes/pipes.module';

import { NxAuthorizeActivateAccountComponent } from './activate-account/activate-account.component';
import { NxAuthorizeAuthCodeComponent } from './auth-code/auth-code.component';
import { NxAuthorizeComponent } from './authorize.component';
import {
    AuthorizeParams,
    AuthorizeState,
    ClientType,
} from './authorize.component.types';
import { NxAuthorizeBackupCodeComponent } from './backup-code/backup-code.component';
import { NxAuthorizeConfirmationComponent } from './confirmation/confirmation.component';
import { NxAuthorizeConnectErrorComponent } from './connect-error/connect-error.component';
import { NxAuthorizeCreateAccountComponent } from './create-account/create-account.component';
import { NxAuthorizeEmailComponent } from './email/email.component';
import { NxAuthorizePasswordComponent } from './password/password.component';
import { NxAuthorizeResetPasswordComponent } from './reset-password/reset-password.component';
import { NxAuthorizeResetRequestComponent } from './reset-request/reset-request.component';

describe('NxAuthorizeComponent', () => {
    let component: NxAuthorizeComponent;
    let fixture: ComponentFixture<NxAuthorizeComponent>;
    let el: DebugElement;
    const translateMock = {
        translations: {
            authorize: {
                loginCloudHeader: () => 'Log in to %CLOUD_NAME%',
                activateHeader: () => 'Activate %CLOUD_NAME% Account',
                createdText: () => 'Account Created!',
                createdAdditional: () => '<p class=\"mb-2\">Confirmation message with the activation link is sent to {accountEmail}.</p><p>Please, activate the account and return here to finish the process.</p>',
                activatedText: () => 'Account Activated!',
                activatedAdditional: () => '<p>Now you may continue to log in to %CLOUD_NAME% here or elsewhere</p>',
                connectedText: () => 'System connected to %CLOUD_NAME%',
                connectHeader: () => 'Connect System to %CLOUD_NAME%',
                connectSubheader: () => 'To access it from anywhere and enable additional features',
                expiredHeader: () => 'Your session has expired',
                expiredAccountSubheader: () => 'Please, log in again as {accountEmail}',
                expiredSubheader: () => 'Please, log in again',
                loginSystemHeader: () => 'Log in to {systemName}',
                loginSystemSubheader: () => 'With your %CLOUD_NAME% Account',
                toAccountSubheader: () => 'To {accountEmail}',
                asAccountSubheader: () => 'As {accountEmail}',
                passwordDisconnect: () => 'to disconnect system from %CLOUD_NAME%',
                passwordMerge: () => 'to merge systems',
                passwordBackup: () => 'to create backup',
                passwordRestore: () => 'to restore system from backup',
                passwordReset: () => 'to reset server',
                passwordRestart: () => 'to restart server',
                passwordDetach: () => 'to detach server',
                createAccountHeader: () => 'Create %CLOUD_NAME% Account',
                loginErrorAdditional: () => 'Please try again or login to the system directly with your local account.',
                connectErrorAdditional: () => 'Please try again later.',
                setupErrorAdditional: () => '<p class=\"mb-2\">Please try again or set up non-cloud system.</p><p>You will be able to connect it to %CLOUD_NAME% anytime after.</p>',
                passResetHeader: () => 'Reset Password',
                newPassHeader: () => 'Set New Password',
                termsAndConditionsHelpText: () => 'Checkbox agreeing to terms and conditions and the privacy policy',
                authCode: {
                    message: () => 'Enter a code from your authentication app to confirm it\'s really you trying to {suffix}',
                    newPass: () => 'set a new password',
                    login: () => 'log in'
                }
            },
            pageTitles: {
                auth: () => 'Authorization'
            }
        }
    };
    nxConfig.dynamicMenus.footer = {
        title: 'Demo',
        description: 'demo',
        nodes: [
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
                related_asset_ids: [],
                urlified: '',
                subtitle: '',
                name_raw: '',
                queryParamsHandling: '',
                nodes: []
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
                related_asset_ids: [],
                urlified: '',
                subtitle: '',
                name_raw: '',
                queryParamsHandling: '',
                nodes: []
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
                related_asset_ids: [],
                urlified: '',
                subtitle: '',
                name_raw: '',
                queryParamsHandling: '',
                nodes: []
            }
        ]
    };
    const configMock = { getConfig: () => nxConfig };
    const processMock = {
        createProcess: () => Promise.resolve()
    };
    const routeMock = {
        queryParams: of({
            client_id: 'someId',
            grant_type: 'password',
            response_type: 'code',
            scope: 'anythingElse'
        }),
        snapshot: { data: { action: '' } }
    };

    const cloudMock = {
        getCommonPasswords: () => of()
    };

    const accountMock = {
        get: () => ({
            can_publish_integration: false,
            name: 'Test',
            first_name: 'Test',
            isCloud: false,
            is_staff: false,
            language: 'en_US',
            last_name: '1234',
            permissions: [],
            is_superuser: false,
            id: 'test',
            email: 'test@test.com',
            is_authenticated: false,
            cookie_reviewed: true
        })
    };

    const localStorageMock = {
        retrieve: () => {}
    };

    const deviceServiceMock = {
        isMobile: () => false
    };

    const menuMock = {
        getMenu: (type: string) => {
            if (type === 'footer') {
                return of(nxConfig.dynamicMenus.footer);
            }
        },
        cleanEmptyNodes: () => {}
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [
                NxAuthorizeComponent,
                NxAuthorizeEmailComponent,
                NxAuthorizePasswordComponent,
                NxAuthorizeCreateAccountComponent,
                NxAuthorizeActivateAccountComponent,
                NxAuthorizeConfirmationComponent,
                NxAuthorizeResetPasswordComponent,
                NxAuthorizeResetRequestComponent,
                NxAuthorizeConnectErrorComponent,
                NxAuthorizeAuthCodeComponent,
                NxAuthorizeBackupCodeComponent
            ],
            imports: [
                CommonModule,
                ReactiveFormsModule,
                FormsModule,
                AngularSvgIconModule.forRoot(),
                HttpClientTestingModule,
                TranslateModule.forRoot(),
                SharedComponentsModule,
                DirectivesModule,
                PipesModule,
            ],
            providers: [
                { provide: NxConfigService, useValue: configMock },
                { provide: NxLanguageProviderService, useValue: translateMock },
                { provide: ActivatedRoute, useValue: routeMock },
                { provide: NxCloudApiService, useValue: cloudMock },
                { provide: NxProcessService, useValue: processMock },
                { provide: NxAccountService, useValue: accountMock },
                { provide: Router, useValue: {} },
                { provide: ElementRef, useValue: {} },
                { provide: LocalStorageService, useValue: localStorageMock },
                { provide: DeviceDetectorService, useValue: deviceServiceMock },
                { provide: WINDOW, useValue: window },
                { provide: NxMenusService, useValue: menuMock },
                MockProvider(NxThemeService),
            ]
        }).compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(NxAuthorizeComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement;
                Object.defineProperty(environment, 'isLocal', { value: false });
                fixture.detectChanges();
                component.windowLargeEnough = false;
            })
            .catch(err => console.error(err));
    }));

    it('should create the component', () => {
        fixture.detectChanges();
        expect(component).toBeTruthy();
    });

    it('should have footer when large', () => {
        fixture.detectChanges();
        component.windowLargeEnough = true;
        fixture.detectChanges();
        const footer = el.nativeElement.querySelectorAll('.auth-footer');
        expect(footer.length).toBe(1);
    });

    it('should have no footer when window is smaller', () => {
        fixture.detectChanges();
        const footer = el.nativeElement.querySelectorAll('.auth-footer');
        expect(footer.length).toBe(0);
    });

    it('should set up default states', () => {
        fixture.detectChanges();
        expect(component.clientType).toBe('loginToCloud');
        expect(component.currentState).toBe('email');
        expect(component.initialData).toEqual(<AuthorizeParams>{
            client_id: 'cloud',
            grant_type: 'password',
            response_type: 'code',
            scope: 'anythingElse',
            redirect_uri: ''
        });
    });

    it('should load webadmin email component', () => {
        Object.defineProperty(environment, 'isLocal', { value: true });
        fixture.detectChanges();
        const loginLabel = el.nativeElement.querySelectorAll('label');
        expect(loginLabel[0].innerText).toBe('Login');
    });

    it('should load loginCloud email component', () => {
        fixture.detectChanges();
        const emailLabel = el.nativeElement.querySelectorAll('label');
        expect(emailLabel[0].innerText).toBe('Email');
        const emailHeader = el.nativeElement.querySelector('h3');
        expect(emailHeader.innerText).toBe(component.LANG.authorize.loginCloudHeader());
        const spans = el.nativeElement.querySelectorAll('span');
        // TODO: current count is 4 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(spans.length).toBe(1);
        expect(spans[0].innerText).toBe('Create Account');
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(2);
        expect(buttons[0].innerText).toBe('Create Account');
        expect(buttons[1].innerText).toBe('Next');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(3);
        // click on next button, get enter email error message
    });

    it('should load connectSystemToCloud email component', () => {
        fixture.detectChanges();
        component.clientType = ClientType.connect;
        fixture.detectChanges();
        const emailLabel = el.nativeElement.querySelectorAll('label');
        expect(emailLabel[0].innerText).toBe('Email');
        const emailHeader = el.nativeElement.querySelector('h3');
        expect(emailHeader.innerText).toBe(component.LANG.authorize.connectHeader());
        const emailSubHeader = el.nativeElement.querySelector('h4');
        expect(emailSubHeader.innerText).toBe(component.LANG.authorize.connectSubheader());
        const inputMessage = el.nativeElement.querySelector('p');
        expect(inputMessage.innerText).toBe('This account will get owner access level');
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(2);
        expect(buttons[0].innerText).toBe('Create Account');
        expect(buttons[1].innerText).toBe('Next');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(3);
    });

    it('should load setupWizard email component', () => {
        fixture.detectChanges();
        component.clientType = ClientType.setup;
        fixture.detectChanges();
        const emailLabel = el.nativeElement.querySelectorAll('label');
        expect(emailLabel[0].innerText).toBe('Email');
        const emailHeader = el.nativeElement.querySelector('h3');
        expect(emailHeader.innerText).toBe(component.LANG.authorize.connectHeader());
        const emailSubHeader = el.nativeElement.querySelector('h4');
        expect(emailSubHeader.innerText).toBe(component.LANG.authorize.connectSubheader());
        const inputMessage = el.nativeElement.querySelector('p');
        expect(inputMessage.innerText).toBe('This account will get owner access level');
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(2);
        expect(buttons[0].innerText).toBe('Setup Non-cloud System');
        expect(buttons[1].innerText).toBe('Next');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(2);
    });

    it('should load renewSessionDesktop email component', () => {
        fixture.detectChanges();
        component.clientType = ClientType.renewDesktop;
        fixture.detectChanges();
        const emailLabel = el.nativeElement.querySelectorAll('label');
        expect(emailLabel[0].innerText).toBe('Email');
        const emailHeader = el.nativeElement.querySelector('h3');
        expect(emailHeader.innerText).toBe(component.LANG.authorize.expiredHeader());
        const emailSubHeader = el.nativeElement.querySelector('h4');
        expect(emailSubHeader.innerText).toBe(component.LANG.authorize.expiredSubheader());
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(1);
        expect(buttons[0].innerText).toBe('Next');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(2);
    });

    it('should load renewSessionWeb email component', () => {
        fixture.detectChanges();
        component.clientType = ClientType.renewWeb;
        fixture.detectChanges();
        const emailLabel = el.nativeElement.querySelectorAll('label');
        expect(emailLabel[0].innerText).toBe('Email');
        const emailHeader = el.nativeElement.querySelector('h3');
        expect(emailHeader.innerText).toBe(component.LANG.authorize.expiredHeader());
        const emailSubHeader = el.nativeElement.querySelector('h4');
        expect(emailSubHeader.innerText).toBe(component.LANG.authorize.expiredSubheader());
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(2);
        expect(buttons[0].innerText).toBe('Create Account');
        expect(buttons[1].innerText).toBe('Next');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(3);
    });

    it('should load loginCloud password component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.password;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('label');
        expect(labels[0].innerText).toBe('Password');
        const passwordHeader = el.nativeElement.querySelector('h3');
        expect(passwordHeader.innerText).toBe(component.LANG.authorize.loginCloudHeader());
        const spans = el.nativeElement.querySelectorAll('span');
        // TODO: current count is 8 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(spans.length).toBe(5);
        expect(spans[0].innerText).toBe(component.LANG.authorize.asAccountSubheader());
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(3);
        expect(buttons[0].innerText).toBe('Forgot Password?');
        expect(buttons[1].innerText).toBe('Back');
        expect(buttons[2].innerText).toBe('Log In');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(4);
    });

    it('should load confirm password disconnect from system component', () => {
        fixture.detectChanges();
        component.clientType = ClientType.passwordDisconnect;
        component.emailLocked = true;
        component.currentState = AuthorizeState.password;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('label');
        expect(labels[0].innerText).toBe('Password');
        const passwordHeader = el.nativeElement.querySelector('h3');
        expect(passwordHeader.innerText).toBe(component.LANG.authorize.loginCloudHeader());
        const spans = el.nativeElement.querySelectorAll('span');
        // TODO: current count is 6 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(spans.length).toBe(3);
        expect(spans[0].innerText).toBe(component.LANG.authorize.asAccountSubheader());
        const disconnectMessage = el.nativeElement.querySelectorAll('p');
        expect(disconnectMessage.length).toBe(1);
        expect(disconnectMessage[0].innerText).toBe('to disconnect system from %CLOUD_NAME%');
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(1);
        expect(buttons[0].innerText).toBe('Log In');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(2);
    });

    it('should load confirm password merge systems component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.password;
        component.emailLocked = true;
        component.clientType = ClientType.passwordMerge;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('label');
        expect(labels[0].innerText).toBe('Password');
        const passwordHeader = el.nativeElement.querySelector('h3');
        expect(passwordHeader.innerText).toBe(component.LANG.authorize.loginCloudHeader());
        const spans = el.nativeElement.querySelectorAll('span');
        // TODO: current count is 6 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(spans.length).toBe(3);
        expect(spans[0].innerText).toBe(component.LANG.authorize.asAccountSubheader());
        const disconnectMessage = el.nativeElement.querySelectorAll('p');
        expect(disconnectMessage.length).toBe(1);
        expect(disconnectMessage[0].innerText).toBe('to merge systems');
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(1);
        expect(buttons[0].innerText).toBe('Log In');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(2);
    });

    it('should load confirm password create backup component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.password;
        component.emailLocked = true;
        component.clientType = ClientType.passwordBackup;
        fixture.detectChanges();
        const message = el.nativeElement.querySelectorAll('p');
        expect(message.length).toBe(1);
        expect(message[0].innerText).toBe('to create backup');
    });

    it('should load confirm password restore system from backup component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.password;
        component.emailLocked = true;
        component.clientType = ClientType.passwordRestore;
        fixture.detectChanges();
        const message = el.nativeElement.querySelectorAll('p');
        expect(message.length).toBe(1);
        expect(message[0].innerText).toBe('to restore system from backup');
    });

    it('should load confirm password reset server component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.password;
        component.emailLocked = true;
        component.clientType = ClientType.passwordReset;
        fixture.detectChanges();
        const message = el.nativeElement.querySelectorAll('p');
        expect(message.length).toBe(1);
        expect(message[0].innerText).toBe('to reset server');
    });

    it('should load confirm password restart server component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.password;
        component.emailLocked = true;
        component.clientType = ClientType.passwordRestart;
        fixture.detectChanges();
        const message = el.nativeElement.querySelectorAll('p');
        expect(message.length).toBe(1);
        expect(message[0].innerText).toBe('to restart server');
    });

    it('should load confirm password detach server component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.password;
        component.emailLocked = true;
        component.clientType = ClientType.passwordDetach;
        fixture.detectChanges();
        const message = el.nativeElement.querySelectorAll('p');
        expect(message.length).toBe(1);
        expect(message[0].innerText).toBe('to detach server');
    });

    it('should load connect password component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.password;
        component.clientType = ClientType.connect;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('label');
        expect(labels[0].innerText).toBe('Password');
        const passwordHeader = el.nativeElement.querySelector('h3');
        expect(passwordHeader.innerText).toBe(component.LANG.authorize.connectHeader());
        const spans = el.nativeElement.querySelectorAll('span');
        // TODO: current count is 8 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(spans.length).toBe(5);
        expect(spans[0].innerText).toBe(component.LANG.authorize.toAccountSubheader());
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(3);
        expect(buttons[0].innerText).toBe('Forgot Password?');
        expect(buttons[1].innerText).toBe('Back');
        expect(buttons[2].innerText).toBe('Log In');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(4);
    });

    it('should load setupWizard password component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.password;
        component.clientType = ClientType.setup;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('label');
        expect(labels[0].innerText).toBe('Password');
        const passwordHeader = el.nativeElement.querySelector('h3');
        expect(passwordHeader.innerText).toBe(component.LANG.authorize.connectHeader());
        const spans = el.nativeElement.querySelectorAll('span');
        // TODO: current count is 8 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(spans.length).toBe(5);
        expect(spans[0].innerText).toBe(component.LANG.authorize.toAccountSubheader());
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(3);
        expect(buttons[0].innerText).toBe('Forgot Password?');
        expect(buttons[1].innerText).toBe('Back');
        expect(buttons[2].innerText).toBe('Log In');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(4);
    });

    it('should load renew session desktop password component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.password;
        component.clientType = ClientType.renewDesktop;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('label');
        expect(labels[0].innerText).toBe('Password');
        const passwordHeader = el.nativeElement.querySelector('h3');
        expect(passwordHeader.innerText).toBe(component.LANG.authorize.expiredHeader());
        const spans = el.nativeElement.querySelectorAll('span');
        // TODO: current count is 7 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(spans.length).toBe(4);
        expect(spans[0].innerText).toBe(component.LANG.authorize.expiredAccountSubheader());
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(2);
        expect(buttons[0].innerText).toBe('Forgot Password?');
        expect(buttons[1].innerText).toBe('Log In');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(3);
    });

    it('should load renew session web password component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.password;
        component.clientType = ClientType.renewWeb;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('label');
        expect(labels[0].innerText).toBe('Password');
        const passwordHeader = el.nativeElement.querySelector('h3');
        expect(passwordHeader.innerText).toBe(component.LANG.authorize.expiredHeader());
        const spans = el.nativeElement.querySelectorAll('span');
        // TODO: current count is 7 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(spans.length).toBe(4);
        expect(spans[0].innerText).toBe(component.LANG.authorize.expiredAccountSubheader());
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(2);
        expect(buttons[0].innerText).toBe('Forgot Password?');
        expect(buttons[1].innerText).toBe('Log In');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(3);
    });

    it('should load 2fa code request component with email', () => {
        fixture.detectChanges();
        component.loginEmail = 'test@email.co';
        component.currentState = AuthorizeState.auth;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('label');
        expect(labels[0].innerText).toBe('Verification code');
        const passwordHeader = el.nativeElement.querySelector('h3');
        expect(passwordHeader.innerText).toBe(component.LANG.authorize.loginCloudHeader());
        const spans = el.nativeElement.querySelectorAll('span');
        // TODO: current count is 7 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(spans.length).toBe(4);
        expect(spans[0].innerText).toBe(component.LANG.authorize.asAccountSubheader());
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(3);
        expect(buttons[0].innerText).toBe('No access to authentication app?');
        expect(buttons[1].innerText).toBe('Back');
        expect(buttons[2].innerText).toBe('Log In');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(3);
    });

    it('should load 2fa code request component without email', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.auth;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('label');
        expect(labels[0].innerText).toBe('Verification code');
        const passwordHeader = el.nativeElement.querySelector('h3');
        expect(passwordHeader.innerText).toBe(component.LANG.authorize.loginCloudHeader());
        // const spans = el.nativeElement.querySelectorAll('span');
        // TODO: current count is 5 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(spans.length).toBe(2);
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(3);
        expect(buttons[0].innerText).toBe('No access to authentication app?');
        expect(buttons[1].innerText).toBe('Back');
        expect(buttons[2].innerText).toBe('Log In');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(3);
    });

    it('should load 2fa backup code request component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.backup;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('label');
        expect(labels[0].innerText).toBe('Backup code');
        const passwordHeader = el.nativeElement.querySelector('h3');
        expect(passwordHeader.innerText).toBe(component.LANG.authorize.loginCloudHeader());
        const spans = el.nativeElement.querySelectorAll('span');
        // TODO: current count is 8 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(spans.length).toBe(5);
        expect(spans[0].innerText).toBe(component.LANG.authorize.asAccountSubheader());
        expect(spans[2].innerText).toBe('Need help?');
        const links = el.nativeElement.querySelectorAll('a');
        expect(links.length).toBe(1);
        expect(links[0].innerText).toBe('Contact support');
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(3);
        expect(buttons[0].innerText).toBe('Use authentication code');
        expect(buttons[1].innerText).toBe('Back');
        expect(buttons[2].innerText).toBe('Log In');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(3);
    });

    it('should load createAccount component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.create;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('label');
        // TODO: current count is 9 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(labels.length).toBe(6);
        expect(labels[0].innerText).toBe('Email');
        expect(labels[1].innerText).toBe('First Name');
        expect(labels[2].innerText).toBe('Last Name');
        expect(labels[3].innerText).toBe('Password');
        const createHeader = el.nativeElement.querySelector('h3');
        expect(createHeader.innerText).toBe(component.LANG.authorize.createAccountHeader());
        const spans = el.nativeElement.querySelectorAll('span');
        // TODO: current count is 9 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(spans.length).toBe(7);
        expect(spans[3].innerText).toBe('I agree to the');
        expect(spans[4].innerText).toBe('and');
        const links = el.nativeElement.querySelectorAll('a');
        expect(links.length).toBe(2);
        expect(links[0].innerText).toBe('Terms and Conditions');
        expect(links[1].innerText).toBe('Privacy policy');
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(3);
        expect(buttons[0].innerText).toBe('Log In');
        expect(buttons[1].innerText).toBe('Back');
        expect(buttons[2].innerText).toBe('Create Account');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(4);
    });

    // it('should load createAccount with existing email for setup wizard clientType', () => {
    //     const testEmail = 'create@example.co';
    //     component.clientType = ClientType.setup;
    //     component.loginEmail = testEmail;
    //     fixture.detectChanges();
    //     component.currentState = AuthorizeState.create;
    //     fixture.detectChanges();
    // });

    it('should load activateAccount component', fakeAsync(() => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.activate;
        // activated = false; fromEmail = false;
        fixture.detectChanges();
        tick();
        let activateHeaders = el.nativeElement.querySelectorAll('h3');
        expect(activateHeaders.length).toBe(2);
        expect(activateHeaders[0].innerText).toBe(component.LANG.authorize.activateHeader());
        expect(activateHeaders[1].innerText).toBe(component.LANG.authorize.createdText());
        let contentMessage = el.queryAll(By.css('.content-message'));
        expect(contentMessage.length).toBe(1);
        expect(contentMessage[0].nativeElement.innerHTML).toBe(component.LANG.authorize.createdAdditional());
        let buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(2);
        expect(buttons[0].innerText).toBe('Log In');
        let icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(1);
        // activated = true; fromEmail = false;
        component.activated$.next(true);
        fixture.detectChanges();
        activateHeaders = el.nativeElement.querySelectorAll('h3');
        expect(activateHeaders.length).toBe(2);
        expect(activateHeaders[1].innerText).toBe(component.LANG.authorize.activatedText());
        contentMessage = el.queryAll(By.css('.content-message'));
        expect(contentMessage.length).toBe(1);
        expect(contentMessage[0].nativeElement.innerText).toBeFalsy();
        buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(2);
        icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(1);
        // activated = true; fromEmail = true;
        component.fromEmail$.next(true);
        fixture.detectChanges();
        activateHeaders = el.nativeElement.querySelectorAll('h3');
        expect(activateHeaders.length).toBe(2);
        expect(activateHeaders[1].innerText).toBe(component.LANG.authorize.activatedText());
        contentMessage = el.queryAll(By.css('.content-message'));
        expect(contentMessage.length).toBe(1);
        expect(contentMessage[0].nativeElement.innerHTML).toBe(component.LANG.authorize.activatedAdditional());
        buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(2);
        icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(1);
    }));

    it('should load reset password request component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.request;
        fixture.detectChanges();
        const emailLabel = el.nativeElement.querySelectorAll('label');
        expect(emailLabel[0].innerText).toBe('Email');
        const emailHeader = el.nativeElement.querySelector('h3');
        expect(emailHeader.innerText).toBe(component.LANG.authorize.passResetHeader());
        // const spans = el.nativeElement.querySelectorAll('span');
        // TODO: current count is 4 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(spans.length).toBe(1);
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(2);
        expect(buttons[0].innerText).toBe('Back');
        expect(buttons[1].innerText).toBe('Reset Password');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(1);
    });

    it('should load reset password component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.reset;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('label');
        expect(labels[0].innerText).toBe('Password');
        const passwordHeader = el.nativeElement.querySelector('h3');
        expect(passwordHeader.innerText).toBe(component.LANG.authorize.newPassHeader());
        const spans = el.nativeElement.querySelectorAll('span');
        // TODO: current count is 6 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(spans.length).toBe(3);
        expect(spans[0].innerText).toBe('For');
        const buttons = el.nativeElement.querySelectorAll('button');
        expect(buttons.length).toBe(1);
        expect(buttons[0].innerText).toBe('Next');
        const icons = el.nativeElement.querySelectorAll('svg-icon');
        expect(icons.length).toBe(2);
    });

    it('should load confirmation component', () => {
        fixture.detectChanges();
        component.currentState = AuthorizeState.confirm;
        fixture.detectChanges();
        const labels = el.nativeElement.querySelectorAll('button');
        expect(labels[0].innerText).toBe('OK');
        const emailHeader = el.nativeElement.querySelector('h3');
        expect(emailHeader.innerText).toBe(component.LANG.authorize.connectedText());
    });

    it('should load loginCloud cloud connect error component', () => {
        component.errorDialog$.next(true);
        fixture.detectChanges();
        const headers = el.nativeElement.querySelectorAll('h3');
        expect(headers[1].innerText).toBe('Cannot connect to %CLOUD_NAME%');
    });

    it('should load connectSystemToCloud cloud connect error component', () => {
        component.errorDialog$.next(true);
        fixture.detectChanges();
        component.clientType = ClientType.connect;
        fixture.detectChanges();
        const headers = el.nativeElement.querySelectorAll('h3');
        expect(headers[1].innerText).toBe('Cannot connect to %CLOUD_NAME%');
    });

    it('should load setupWizard cloud connect error component', () => {
        component.errorDialog$.next(true);
        fixture.detectChanges();
        component.clientType = ClientType.setup;
        fixture.detectChanges();
        const headers = el.nativeElement.querySelectorAll('h3');
        expect(headers[1].innerText).toBe('Cannot connect to %CLOUD_NAME%');
        const spans = el.nativeElement.querySelectorAll('span');
        // TODO: current count is 5 because of theme test component
        // UNCOMMENT after tests!!!
        // expect(spans.length).toBe(2);
        expect(spans[1].innerText).toBe('Setup Non-cloud System');
    });

    it('should load loginToWebadmin cloud connect error component', () => {
        component.errorDialog$.next(true);
        fixture.detectChanges();
        component.clientType = ClientType.loginWebadmin;
        fixture.detectChanges();
        const headers = el.nativeElement.querySelectorAll('h3');
        expect(headers[1].innerText).toBe('Cannot connect to %CLOUD_NAME%');
    });

    // test links that can start with 'http', '?code=', and 'redirect-oauth'
});

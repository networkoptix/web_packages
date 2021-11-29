import {
    ComponentFixture,
    TestBed,
    waitForAsync,
    inject,
    tick,
    fakeAsync
} from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxAccountSecurityComponent } from '@pages/account/security/security.component';
import { NxProcessService } from '@services/process.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxSystemsService } from '@services/systems.service';
import { NxAccountService } from '@services/account.service';
import { NxMenuService } from '@src/menu';
import { NxApplyService } from '@services/apply.service';
import { NxPageService } from '@services/page.service';
import { TranslateModule } from '@ngx-translate/core';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxSwitchComponent } from '@components/switch/switch.component';
import { NxCheckboxComponent } from '@components/checkbox/checkbox.component';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

describe('NxAccountSecurityComponent', () => {
    let component: NxAccountSecurityComponent;
    let fixture: ComponentFixture<NxAccountSecurityComponent>;
    let el;
    let LANG: LanguageI18NStaticTypes;

    const configMock = { getConfig: () => nxConfig };
    const translateMock = {
        translations: {
            'Two-factor authentication': 'Two-factor authentication',
            pageTitles: {
                security: 'Security'
            },
            security: {
                twoFa: {
                    twoFADescription_a1: jasmine.createSpy(),
                    twoFADescription_a2: jasmine.createSpy(),
                    systemsRemainder: jasmine.createSpy(),
                    v5Warning_a1: jasmine.createSpy(),
                    v5Warning_a2: jasmine.createSpy(),
                    v5Warning_a3: jasmine.createSpy(),
                    v5Warning_a4: jasmine.createSpy(),
                    v5Warning_a5: jasmine.createSpy(),
                    v5Warning_b: jasmine.createSpy()
                }
            }
        }
    };

    let accountSpy: jasmine.SpyObj<NxAccountService>;
    const systemsServiceMock = {
        systemsSubject: of([])
    };

    beforeEach(waitForAsync(() => {
        const mockAccountService = jasmine.createSpyObj('NxAccountService', ['account', 'get']);
        const spyCreateProcess = jasmine.createSpyObj('NxProcessService', ['createProcess']);
        const spyApplyInitPageWatcher = jasmine.createSpyObj('NxApplyService', ['initPageWatcher']);

        TestBed
            .configureTestingModule({
                imports: [
                    TranslateModule.forRoot(),
                    FormsModule,
                    NgbModule
                ],
                declarations: [
                    NxAccountSecurityComponent,
                    NxPreLoaderComponent,
                    NxSwitchComponent,
                    NxContentBlockComponent,
                    NxContentBlockSectionComponent,
                    NxCheckboxComponent
                ],
                providers: [
                    { provide: NxLanguageProviderService, useValue: translateMock },
                    { provide: NxConfigService, useValue: configMock },
                    { provide: NxProcessService, useValue: spyCreateProcess },
                    { provide: ActivatedRoute, useValue: {} },
                    { provide: NxCloudApiService, useValue: {} },
                    { provide: NxSystemsService, useValue: systemsServiceMock },
                    { provide: NxAccountService, useValue: mockAccountService },
                    { provide: NxMenuService, useValue: {} },
                    { provide: NxApplyService, useValue: spyApplyInitPageWatcher },
                    { provide: NxPageService, useValue: {} },
                    { provide: NxDialogsService, useValue: {} }
                ]
            })
            .compileComponents().then(inject([NxLanguageProviderService], (service: NxLanguageProviderService) => {
                LANG = service.translations;
                fixture = TestBed.createComponent(NxAccountSecurityComponent);
                component = fixture.componentInstance;
                el = fixture.debugElement.nativeElement;

                accountSpy = TestBed.inject(NxAccountService) as jasmine.SpyObj<NxAccountService>;
                // @ts-ignore
                accountSpy.account.and.returnValue(of({}));

                fixture.detectChanges();
                component.account = {
                    can_publish_integration: false,
                    name: 'test',
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
                    cookie_reviewed: true,
                    account2faEnabled: false,
                    totpExistsForAccount: false
                };
                fixture.detectChanges();
            }));
    }));

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    describe('when OFF', () => {
        it('should have one block', () => {
            const block = el.querySelectorAll('nx-block');
            expect(block.length).toBe(1);
        });

        it('should have header and body', () => {
            const cardHeader = el.querySelector('nx-block header div h4');
            const cardHeaderSwitch = el.querySelector('nx-block header div nx-switch');
            const cardBody = el.querySelector('nx-block nx-section span');
            expect(cardHeader.innerHTML).toBe(LANG['Two-factor authentication']);
            expect(cardHeaderSwitch).toBeTruthy();
            expect(cardBody.innerHTML.length).toBeGreaterThan(20);
        });

        it('should not have verification code elements', () => {
            const checkbox = el.querySelector('.tfauth-checkbox');
            const warning = el.querySelector('.tfauth-v5-warning');
            expect(checkbox).toBeNull();
            expect(warning).toBeNull();
        });

        it('should call switchToggle on click', fakeAsync(() => {
            const spy = spyOn(component, 'switchToggle');
            const tfaSwitch = fixture.debugElement.nativeElement.querySelector('nx-block header div nx-switch');
            const nxSwitch = tfaSwitch.querySelector('div'); // id="2fa-active-status"
            nxSwitch.click();
            fixture.detectChanges();
            tick();
            expect(spy.calls.count()).toBe(1, 'switchToggle method should be called once');
        }));
    });

    describe('when ON', () => {
        beforeEach(() => {
            component.account2faEnabled = true;
            component.totpExistsForAccount = true;
            fixture.detectChanges();
        });

        it('should have two blocks', () => {
            const block = el.querySelectorAll('nx-block');
            expect(block.length).toBe(2);
        });

        it('should have verification code checkbox', () => {
            const checkbox = el.querySelector('.tfauth-checkbox');
            expect(checkbox).toBeTruthy();
        });

        it('should not have a warning with no v5.0 systems', () => {
            const warning = el.querySelector('.tfauth-v5-warning');
            expect(warning).toBeNull();
        });

        it('should have a warning with at least one v5.0 system', () => {
            component.subV5Systems = [{ name: 'foo' } as any];
            fixture.detectChanges();
            const warning = el.querySelector('.tfauth-v5-warning');
            expect(warning).toBeTruthy();
        });
    });
});

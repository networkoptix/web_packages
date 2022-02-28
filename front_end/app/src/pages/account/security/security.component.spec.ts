import {
    ComponentFixture,
    TestBed,
    waitForAsync,
    tick,
    fakeAsync
} from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import {
    MockModule,
    MockComponent,
    MockProvider
} from 'ng-mocks';

import {
    NxCheckboxComponent
} from '@components/checkbox/checkbox.component';
import {
    NxContentBlockComponent
} from '@components/content-block/content-block.component';
import {
    NxContentBlockSectionComponent
} from '@components/content-block/section/section.component';
import {
    NxPreLoaderComponent
} from '@components/placeholders/pre-loader/pre-loader.component';
import { NxPopoverService } from '@components/popover/popover.service';
import { NxSwitchComponent } from '@components/switch/switch.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAccountService } from '@services/account.service';
import { NxApplyService } from '@services/apply.service';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxProcessService } from '@services/process.service';
import { NxSystemsService } from '@services/systems.service';
import { NxMenuService } from '@src/menu/menu.service';
import { NxSafePipe } from '@src/pipes/nx-safe';

import { NxAccountSecurityComponent } from './security.component';

describe('NxAccountSecurityComponent', () => {
    let component: NxAccountSecurityComponent;
    let fixture: ComponentFixture<NxAccountSecurityComponent>;
    let el: HTMLDivElement;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [
                TranslateModule.forRoot(),
                MockModule(FormsModule),
            ],
            declarations: [
                NxAccountSecurityComponent,
                NxSwitchComponent,
                NxSafePipe,
                MockComponent(NxPreLoaderComponent),
                MockComponent(NxContentBlockComponent),
                MockComponent(NxContentBlockSectionComponent),
                MockComponent(NxCheckboxComponent),
            ],
            providers: [
                MockProvider(NxConfigService),
                MockProvider(NxLanguageProviderService),
                MockProvider(NxApplyService),
                MockProvider(NxProcessService),
                MockProvider(NxAccountService),
                MockProvider(NxDialogsService),
                MockProvider(NxMenuService),
                MockProvider(NxPageService),
                MockProvider(NxSystemsService),
                MockProvider(NxPopoverService),
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(NxAccountSecurityComponent);
        component = fixture.componentInstance;
        el = fixture.debugElement.nativeElement;
        fixture.detectChanges();
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
            const cardHeaderSwitch =
                el.querySelector('nx-block header div nx-switch');
            const cardBody = el.querySelector('nx-block nx-section span');
            expect(cardHeader.innerHTML).toBe('Two-factor authentication');
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
            const tfaSwitch = fixture.debugElement.nativeElement
                .querySelector('nx-block header div nx-switch');
            const nxSwitch = tfaSwitch.querySelector('div');
            // id="2fa-active-status"
            // Can't directly query with id name since it starts with a number
            nxSwitch.click();
            fixture.detectChanges();
            tick();
            expect(spy.calls.count())
                .toBe(1, 'switchToggle method should be called once');
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

        it('should have a warning with at least one v5.0 system if checkbox is checked', () => {
            component.subV5Systems = [{ name: 'foo' } as any];
            component.verificationWatcher.value = true;
            fixture.detectChanges();
            const warning = el.querySelector('.tfauth-v5-warning');
            expect(warning).toBeTruthy();
        });
        it('should not have a warning with at least one v5.0 system if checkbox is unchecked', () => {
            component.subV5Systems = [{ name: 'foo' } as any];
            component.verificationWatcher.value = false;
            fixture.detectChanges();
            const warning = el.querySelector('.tfauth-v5-warning');
            expect(warning).toBeNull();
        });
    });
});

import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
    ComponentFixture,
    fakeAsync,
    TestBed,
    waitForAsync
} from '@angular/core/testing';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { MockProvider } from 'ng-mocks';

import { NxConfigService } from '@services/nx-config/nx-config.service';
import { Process } from '@services/process.service/process';

import { NxProcessButtonComponent } from './process-button.component';

describe('NxProcessButtonComponent', () => {
    let component: NxProcessButtonComponent;
    let fixture: ComponentFixture<NxProcessButtonComponent>;
    let el: HTMLElement;
    let button: HTMLElement;

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                imports: [
                    AngularSvgIconModule.forRoot(),
                    HttpClientTestingModule
                ],
                declarations: [
                    NxProcessButtonComponent
                ],
                providers: [
                    MockProvider(NxConfigService),
                    MockProvider(Process)
                ]
            })
            .compileComponents();

        fixture = TestBed.createComponent(NxProcessButtonComponent);
        el = fixture.debugElement.nativeElement;
        component = fixture.componentInstance;
        component.buttonText = 'Test';
        component.clickFn = () => {};
        component.process = TestBed.inject(Process);

        fixture.detectChanges();

        button = el.querySelector('button.btn-primary');
    }));

    it('should create NxProcessButtonComponent', () => {
        expect(component).toBeTruthy();
    });

    it('should init component', () => {
        expect(component.buttonText).toBe('Test');
        expect(component.buttonClass).toBe('btn-primary');
        expect(component.buttonDisabled).toBeUndefined();
        expect(component.actionType).toBeUndefined();
        expect(component.form).toBeUndefined();
        expect(component.customClass).toBe('');
        expect(component.customButtonClass).toBe('');
        expect(component.svg).toBeUndefined();
        expect(component.textOnly).toBeFalse();
        expect(component.reverseButton).toBeFalse();
        expect(component.removeMinWidth).toBeFalse();

        expect(button.innerText).toBe('Test');
    });

    it('should indicate Process running after click', fakeAsync(() => {
        const spy = spyOn(component, 'clickHandler');
        button.click();

        expect(spy.calls.count()).toBe(1);
        component.process.processing = true;
        fixture.detectChanges();

        const fakeButton = el.querySelector('div div.loading');
        expect(fakeButton.classList.contains('disabled')).toBeTrue();

        const dots = fakeButton.querySelectorAll('div span');
        expect(dots.length).toBe(3);
        expect(dots[0].className).toBe('dot1');
        expect(dots[1].className).toBe('dot2');
        expect(dots[2].className).toBe('dot3');
    }));

    it('should have different layout if textOnly', () => {
        const spy = spyOn(component, 'clickHandler');

        component.textOnly = true;
        fixture.detectChanges();

        const svgButton = el.querySelector('.text-button svg-icon');
        expect(svgButton).toBeDefined();

        const textButton = el.querySelector<HTMLAnchorElement>(
            '.text-button a'
        );
        expect(textButton.innerText).toBe('Open in %VMS_NAME%');
        textButton.click();
        expect(spy.calls.count()).toBe(1);
    });

    it('should display processing text in textOnly button', () => {
        component.textOnly = true;
        component.process.processing = true;
        fixture.detectChanges();
        const processText = el.querySelector<HTMLSpanElement>(
            '.text-button span'
        );
        expect(processText.innerText).toBe('Opening %VMS_NAME%...');
    });
});

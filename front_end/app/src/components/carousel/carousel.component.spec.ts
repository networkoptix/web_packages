import {
    ComponentFixture,
    TestBed,
    waitForAsync
} from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MockProvider } from 'ng-mocks';

import { NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxCarouselComponent } from './carousel.component';

describe('NxCarouselComponent', () => {
    let component: NxCarouselComponent;
    let fixture: ComponentFixture<NxCarouselComponent>;
    let el;

    const screenshots = [{
        id: 'Screenshot1',
        value: 'https://cloud-test.hdw.mx/static/media/test-asset-011119-amironenko/overviewscreenshot1-257/Screenshot_23.png',
        sortKey: 1,
        caption: 'screenshot 23'
    }, {
        id: 'Screenshot2',
        value: 'https://cloud-test.hdw.mx/static/media/test-asset-011119-amironenko/overviewscreenshot2-259/Screenshot_25.png',
        sortKey: 2
    }];

    beforeEach(waitForAsync(() => {
        TestBed
            .configureTestingModule({
                imports: [BrowserAnimationsModule],
                declarations: [NxCarouselComponent],
                providers: [
                    MockProvider(NxLanguageProviderService),
                    MockProvider(NxConfigService)
                ]
            })
            .compileComponents();

        fixture = TestBed.createComponent(NxCarouselComponent);
        component = fixture.componentInstance;
        el = fixture.debugElement.nativeElement;
        component.type = 'Overview';
        component.screenshots = screenshots;
        fixture.detectChanges();
    }));

    it('should create component', () => {
        expect(component).toBeTruthy();
    });

    it('should populate image count', () => {
        expect(component.imageCount).toBe(2);
    });

    it('should have wrapper', () => {
        const carousel = el.querySelector('.carousel');
        expect(carousel.className).toContain('slide embed-responsive-item');
    });

    it('should have left nav', () => {
        const nav = el.querySelectorAll('.carousel .carousel-control-prev .nav-arrow.left span');
        expect(nav.length).toBe(2);
    });

    it('should set index and caption', () => {
        expect(component.currentIndex).toBe(0);
        component.setIndex(1);
        expect(component.currentIndex).toBe(1);
        expect(component.caption).toBeUndefined();
        component.setIndex(0);
        expect(component.currentIndex).toBe(0);
        expect(component.caption).toBe('screenshot 23');
    });

    it('should have right nav', () => {
        const nav = el.querySelectorAll('.carousel .carousel-control-next .nav-arrow.right span');
        expect(nav.length).toBe(2);
    });

    it('should have img(s)', () => {
        const images = el.querySelectorAll('.carousel .carousel-item .carousel-img img');
        expect(images.length).toBe(2);
        expect(images[0].src).toBe(screenshots[0].value);
        expect(images[0].alt).toBe(screenshots[0].caption);

        expect(images[1].src).toBe(screenshots[1].value);
        expect(images[1].alt).toBe('Overview carousel image 2');
    });

    it('should left nav be clickable', () => {
        const spy = spyOn(component, 'previousElement');
        const button = el.querySelector('.carousel .carousel-control-prev');
        button.dispatchEvent(new MouseEvent('click'));
        expect(spy.calls.count()).toBe(1, 'previousElement method should be called once');
    });

    it('should right nav be clickable', () => {
        const spy = spyOn(component, 'nextElement');
        const button = el.querySelector('.carousel .carousel-control-next');
        button.dispatchEvent(new MouseEvent('click'));
        expect(spy.calls.count()).toBe(1, 'nextElement method should be called once');
    });

    it('should decrement currentIndex', () => {
        const spy = spyOn(component, 'setCaption');
        expect(component.currentIndex).toBe(0);
        component.previousElement();
        expect(spy.calls.count()).toBe(1, 'setCaption method should be called once');
        expect(component.currentIndex).toBe(1);
    });

    it('should increment currentIndex', () => {
        const spy = spyOn(component, 'setCaption');
        expect(component.currentIndex).toBe(0);
        component.nextElement();
        expect(spy.calls.count()).toBe(1, 'setCaption method should be called once');
        expect(component.currentIndex).toBe(1);
    });
});

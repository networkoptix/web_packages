import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { NxPreLoaderComponent } from './pre-loader.component';

describe('NxPreLoaderComponent', () => {
    let component: NxPreLoaderComponent;
    let fixture: ComponentFixture<NxPreLoaderComponent>;
    let el: DebugElement;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            declarations: [NxPreLoaderComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(NxPreLoaderComponent);
        component = fixture.componentInstance;
        el = fixture.debugElement;

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('if type not defined', () => {
        it('should have wrapper class', () => {
            const wrapper = el.nativeElement.querySelectorAll('.placeholder-wrapper');
            expect(wrapper.length).toBe(1);
        });

        it('should have has-preloader', () => {
            const preloader = el.nativeElement.querySelectorAll('.placeholder-wrapper .has-preloader');
            expect(preloader.length).toBe(1);
            expect(preloader[0].className).toBe('placeholder has-preloader');
        });

        it('should have placeholder-content', () => {
            const content = el.nativeElement.querySelectorAll('.placeholder-wrapper .has-preloader .placeholder-content');
            expect(content.length).toBe(1);
            expect(content[0].className).toBe('placeholder-content');
        });

        it('should have placeholder-preloader', () => {
            const content = el.nativeElement.querySelectorAll('.placeholder-wrapper .has-preloader .placeholder-content .placeholder-preloader');
            expect(content.length).toBe(1);
        });

        it('should have 3 divs (dots)', () => {
            const dots = el.nativeElement.querySelectorAll('.placeholder-preloader .circleG');
            expect(dots.length).toBe(3);

            expect(dots[0].className).toBe('circleG circleG_1');
            expect(dots[1].className).toBe('circleG circleG_2');
            expect(dots[2].className).toBe('circleG circleG_3');
        });
    });

    describe('if type is defined', () => {
        beforeEach(() => {
            component.type = 'page';
            fixture.detectChanges();
        });

        it('should not have wrapper class', () => {
            const wrapper = el.nativeElement.querySelectorAll('.placeholder-wrapper');
            expect(wrapper.length).toBe(0);
        });

        it('should have has-preloader and type', () => {
            const preloader = el.nativeElement.querySelectorAll('div .has-preloader');
            expect(preloader.length).toBe(1);
            expect(preloader[0].className).toBe('placeholder has-preloader page');
        });

        it('should have placeholder-content and type', () => {
            const content = el.nativeElement.querySelectorAll(
                'div .has-preloader .placeholder-content'
            );
            expect(content.length).toBe(1);
            expect(content[0].className).toBe('placeholder-content page');
        });
    });
});

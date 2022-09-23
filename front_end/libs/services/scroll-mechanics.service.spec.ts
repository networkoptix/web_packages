import { waitForAsync, TestBed } from '@angular/core/testing';

import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { WINDOW } from '@services/window-provider';

describe('Scroll mechanics service', () => {
    let scroll: NxScrollMechanicsService;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            providers: [
                { provide: WINDOW, useValue: window }
            ]
        });
        scroll = TestBed.inject(NxScrollMechanicsService);
    }));

    it('should create the service', () => {
        expect(scroll).toBeTruthy();
        expect(NxScrollMechanicsService.HEADER_OFFSET).toBe(48);
        expect(NxScrollMechanicsService.SCROLL_OFFSET).toBe(48 + 16); // header + padding
        expect(NxScrollMechanicsService.MEDIA.xs).toBe(0);
        expect(NxScrollMechanicsService.MEDIA.sm).toBe(576);
        expect(NxScrollMechanicsService.MEDIA.md).toBe(768);
        expect(NxScrollMechanicsService.MEDIA.lg).toBe(992);
        expect(NxScrollMechanicsService.MEDIA.xl).toBe(1280);
        expect(NxScrollMechanicsService.MEDIA.xxl).toBe(1440);
        expect(NxScrollMechanicsService.MEDIA.xxxl).toBe(1600);
        expect(NxScrollMechanicsService.MEDIA.xxxxl).toBe(1920);
    });

    it('should have setter and getter (elementTableWidth)', () => {
        scroll.elementTableWidth = 42;

        scroll.elementTableWidthSubject.subscribe(() => {
            expect(scroll.elementTableWidth).toBe(42);
        });
    });

    it('should have setter and getter (elementViewWidth)', () => {
        scroll.elementViewWidth = 42;

        scroll.elementViewWidthSubject.subscribe(() => {
            expect(scroll.elementViewWidth).toBe(42);
        });
    });

    it('should have setter and getter (searchViewHeight)', () => {
        scroll.searchViewHeight = 42;

        scroll.searchViewHeightSubject.subscribe(() => {
            expect(scroll.searchViewHeight).toBe(42);
        });
    });

    it('should have setter and getter (windowScroll)', () => {
        scroll.windowScroll = 42;

        scroll.windowScrollSubject.subscribe(() => {
            expect(scroll.windowScroll).toBe(42);
        });
    });

    it('should have setter and getter (panelVisible)', () => {
        scroll.panelVisible = true;

        scroll['panelSubject'].subscribe(() => {
            expect(scroll.panelVisible).toBe(true);
        });
    });

    it('should set window  subject', () => {
        scroll.setWindowSize(800, 1280);
        scroll.windowSizeSubject.subscribe(dimensions => {
            expect(dimensions).toEqual({ height: 800, width: 1280 });
        });
    });

    it('should check window size (max)', () => {
        let result: boolean;
        // @ts-expect-error Need to update global for test
        viewport.set('screen');

        result = scroll.mediaQueryMax(NxScrollMechanicsService.MEDIA.xl);
        expect(result).toBeFalse();

        result = scroll.mediaQueryMax(NxScrollMechanicsService.MEDIA.xxl);
        expect(result).toBeTrue();
    });

    it('should check window size (min)', () => {
        let result: boolean;
        // @ts-expect-error Need to update global for test
        viewport.set('screen');

        result = scroll.mediaQueryMin(NxScrollMechanicsService.MEDIA.sm);
        expect(result).toBeTrue();

        result = scroll.mediaQueryMin(NxScrollMechanicsService.MEDIA.xxxxl);
        expect(result).toBeFalse();
    });
});

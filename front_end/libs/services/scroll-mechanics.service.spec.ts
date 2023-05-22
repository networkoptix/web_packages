import { waitForAsync, TestBed } from '@angular/core/testing';

import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { WINDOW } from '@services/window-provider';
import { GridBreakpoints } from '@styles/theme-variables-common';

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

    it('should check window size (max)', () => {
        let result: boolean;
        // @ts-expect-error Need to update global for test
        viewport.set('screen');

        result = scroll.mediaQueryMax(GridBreakpoints.XL);
        expect(result).toBeFalse();

        result = scroll.mediaQueryMax(GridBreakpoints.XXL);
        expect(result).toBeTrue();
    });

    it('should check window size (min)', () => {
        let result: boolean;
        // @ts-expect-error Need to update global for test
        viewport.set('screen');

        result = scroll.mediaQueryMin(GridBreakpoints.SM);
        expect(result).toBeTrue();

        result = scroll.mediaQueryMin(GridBreakpoints.XXXXL);
        expect(result).toBeFalse();
    });
});

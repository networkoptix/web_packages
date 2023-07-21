import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { GridBreakpoints } from '@styles/theme-variables-common';

import { setupTestBed } from './src/setup';

const setupScrollService = async (): Promise<{
    scroll: NxScrollMechanicsService;
    patchMatchMedia;
}> => {
    const {
        inject,
        patchWindow: { patchMatchMedia },
    } = await setupTestBed();
    const scroll = inject(NxScrollMechanicsService);
    return {
        scroll,
        patchMatchMedia,
    };
};

describe('Scroll mechanics service', () => {
    it('should create the service', async () => {
        const { scroll } = await setupScrollService();
        expect(scroll).toBeTruthy();
        expect(NxScrollMechanicsService.HEADER_OFFSET).toBe(48);
        expect(NxScrollMechanicsService.SCROLL_OFFSET).toBe(48 + 16); // header + padding
    });

    it('should have setter and getter (elementTableWidth)', async () => {
        const { scroll } = await setupScrollService();
        scroll.elementTableWidth = 42;

        expect(scroll.elementTableWidth).toBe(42);
    });

    it('should have setter and getter (elementViewWidth)', async () => {
        const { scroll } = await setupScrollService();
        scroll.elementViewWidth = 42;

        scroll.elementViewWidthSubject.subscribe(() => {
            expect(scroll.elementViewWidth).toBe(42);
        });
    });

    it('should have setter and getter (searchViewHeight)', async () => {
        const { scroll } = await setupScrollService();
        scroll.searchViewHeight = 42;

        expect(scroll.searchViewHeight).toBe(42);
    });

    it('should have setter and getter (windowScroll)', async () => {
        const { scroll } = await setupScrollService();
        scroll.windowScroll = 42;

        expect(scroll.windowScroll).toBe(42);
    });

    it('should have setter and getter (panelVisible)', async () => {
        const { scroll } = await setupScrollService();
        scroll.panelVisible = true;

        expect(scroll.panelVisible).toBe(true);
    });

    it('should check window size (max)', async () => {
        const { scroll, patchMatchMedia } = await setupScrollService();
        const { matchMediaSpy, setMatches } = patchMatchMedia();

        setMatches(false);
        const xlResult = scroll.mediaQueryMax(GridBreakpoints.XL);
        expect(xlResult).toBeFalsy();
        expect(matchMediaSpy).toHaveBeenCalledWith(`(max-width: ${GridBreakpoints.XL}px)`);

        setMatches(true);
        const xxlResult = scroll.mediaQueryMax(GridBreakpoints.XXL);
        expect(xxlResult).toBeTruthy();
        expect(matchMediaSpy).toHaveBeenCalledWith(`(max-width: ${GridBreakpoints.XXL}px)`);
    });

    it('should check window size (min)', async () => {
        const { scroll, patchMatchMedia } = await setupScrollService();
        const { matchMediaSpy, setMatches } = patchMatchMedia();

        setMatches(true);
        const smResult = scroll.mediaQueryMin(GridBreakpoints.SM);
        expect(smResult).toBeTruthy();
        expect(matchMediaSpy).toHaveBeenCalledWith(`(min-width: ${GridBreakpoints.SM}px)`);

        setMatches(false);
        const xxxlResult = scroll.mediaQueryMin(GridBreakpoints.XXXXL);
        expect(xxxlResult).toBeFalsy();
        expect(matchMediaSpy).toHaveBeenCalledWith(`(min-width: ${GridBreakpoints.XXXXL}px)`);
    });
});

import { setupComponent } from '../src/setup';

import { NxExternalVideoComponent } from './external-video.component';

const setupExternalVideoComponent = async (): Promise<
    Awaited<ReturnType<typeof setupComponent<NxExternalVideoComponent>>>
    & { updateVideoSrc: (videoSrc: string) => void }
> => {
    const setup = await setupComponent(NxExternalVideoComponent);

    const updateVideoSrc = (videoSrc: string): void => {
        setup.component.videoSrc = videoSrc;
        setup.component.ngOnInit();
        setup.fixture.detectChanges();
    };

    return {
        ...setup,
        updateVideoSrc,
    };
};

describe('NxExternalVideoComponent', () => {
    it('should create the component', async () => {
        const { component } = await setupExternalVideoComponent();

        expect(component).toBeTruthy();
    });

    it('should show basic component for youtube link', async () => {
        const { debugElement, updateVideoSrc } = await setupExternalVideoComponent();
        updateVideoSrc('https://www.youtube.com/watch?v=2suNl4Yo3uM&ab_channel=NetworkOptix');
        const frameDiv = debugElement.nativeElement.querySelector('div.embed-responsive');
        const iFrame = debugElement.nativeElement.querySelector('iframe');
        expect(frameDiv).toBeTruthy();
        expect(iFrame).toBeTruthy();
    });

    it('should show basic component for vimeo link', async () => {
        const { debugElement, updateVideoSrc } = await setupExternalVideoComponent();
        updateVideoSrc('https://vimeo.com/269230259');
        const frameDiv = debugElement.nativeElement.querySelector('div.embed-responsive');
        const iFrame = debugElement.nativeElement.querySelector('iframe');
        expect(frameDiv).toBeTruthy();
        expect(iFrame).toBeTruthy();
    });

    it('should not show for videos not Youtube or Vimeo', async () => {
        const { debugElement, updateVideoSrc } = await setupExternalVideoComponent();
        updateVideoSrc('https://www.dailymotion.com/video/x84kg5v?playlist=x6lgtp');
        const frameDiv = debugElement.nativeElement.querySelector('div.embed-responsive');
        const iFrame = debugElement.nativeElement.querySelector('iframe');
        expect(frameDiv).toBeFalsy();
        expect(iFrame).toBeFalsy();
    });
});

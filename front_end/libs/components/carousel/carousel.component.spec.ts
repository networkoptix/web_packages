import { setupComponent } from '../src/setup';

import { NxCarouselComponent } from './carousel.component';

const screenshots = [
    {
        id: 'Screenshot1',
        value: 'https://cloud-test.hdw.mx/static/media/test-asset-011119-amironenko/overviewscreenshot1-257/Screenshot_23.png',
        sortKey: 1,
        caption: 'screenshot 23',
    },
    {
        id: 'Screenshot2',
        value: 'https://cloud-test.hdw.mx/static/media/test-asset-011119-amironenko/overviewscreenshot2-259/Screenshot_25.png',
        sortKey: 2,
    },
];

const handleSetup = async (): ReturnType<typeof setupComponent<NxCarouselComponent>> => {
    const setup = await setupComponent(NxCarouselComponent);
    setup.component.screenshots = screenshots;
    setup.component.type = 'Overview';
    setup.component.ngOnInit();
    setup.fixture.detectChanges();
    await setup.fixture.whenStable();
    return setup;
};

describe('NxCarouselComponent', () => {
    it('should create component', async () => {
        const { component } = await handleSetup();
        expect(component).toBeTruthy();
    });

    it('should populate image count', async () => {
        const { component } = await handleSetup();
        expect(component.imageCount).toBe(2);
    });

    it('should have wrapper', async () => {
        const { fixture } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        const carousel = el.querySelector('.carousel');
        expect(carousel.className).toContain('slide embed-responsive-item');
    });

    it('should have left nav', async () => {
        const { fixture } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        const nav = el.querySelectorAll('.carousel .carousel-control-prev .nav-arrow.left span');
        expect(nav.length).toBe(2);
    });

    it('should set index and caption', async () => {
        const { component } = await handleSetup();
        expect(component.currentIndex).toBe(0);
        component.setIndex(1);
        expect(component.currentIndex).toBe(1);
        expect(component.caption).toBeUndefined();
        component.setIndex(0);
        expect(component.currentIndex).toBe(0);
        expect(component.caption).toBe('screenshot 23');
    });

    it('should have right nav', async () => {
        const { fixture } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        const nav = el.querySelectorAll('.carousel .carousel-control-next .nav-arrow.right span');
        expect(nav.length).toBe(2);
    });

    it('should have img(s)', async () => {
        const { fixture } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        const images = el.querySelectorAll('.carousel .carousel-item .carousel-img img');
        expect(images.length).toBe(2);
        expect(images[0].src).toBe(screenshots[0].value);
        expect(images[0].alt).toBe(screenshots[0].caption);

        expect(images[1].src).toBe(screenshots[1].value);
        expect(images[1].alt).toBe('Overview carousel image 2');
    });

    it('should left nav be clickable', async () => {
        const { component, fixture } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        const spy = jest.spyOn(component, 'previousElement');
        const button = el.querySelector('.carousel .carousel-control-prev');
        button.dispatchEvent(new MouseEvent('click'));
        expect(spy).toBeCalledTimes(1);
    });

    it('should right nav be clickable', async () => {
        const { component, fixture } = await handleSetup();
        const el = fixture.elementRef.nativeElement;
        const spy = jest.spyOn(component, 'nextElement');
        const button = el.querySelector('.carousel .carousel-control-next');
        button.dispatchEvent(new MouseEvent('click'));
        expect(spy).toBeCalledTimes(1);
    });

    it('should decrement currentIndex', async () => {
        const { component } = await handleSetup();
        const spy = jest.spyOn(component, 'setCaption');
        expect(component.currentIndex).toBe(0);
        component.previousElement();
        expect(spy).toBeCalledTimes(1);
        expect(component.currentIndex).toBe(1);
    });

    it('should increment currentIndex', async () => {
        const { component } = await handleSetup();
        const spy = jest.spyOn(component, 'setCaption');
        expect(component.currentIndex).toBe(0);
        component.nextElement();
        expect(spy).toBeCalledTimes(1);
        expect(component.currentIndex).toBe(1);
    });
});

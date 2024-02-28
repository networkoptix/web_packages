import { PAGE_PLACEHOLDER } from '@components/placeholders/pageV2/page-placeholder.types';
import { setupComponent } from '@components/src/setup';
import staticLang from '@language_static';
import { icons } from '@static-variables';

import { NxPagePlaceholderV2Component } from './page-placeholder.component';

// BREADCRUMBS
// const setWindowSize = (width: number = 1200, height: number = 600): void => {
//     windowFactory().innerWidth = width;
//     windowFactory().innerHeight = height;
// };

const setupPagePlaceholderV2Component = (): ReturnType<
    typeof setupComponent<NxPagePlaceholderV2Component>
> => setupComponent(NxPagePlaceholderV2Component);

describe('NxPagePlaceholderV2Component', () => {
    // BREADCRUMBS
    // it('should create w/ init value', async () => {
    //     setWindowSize(600, 420);
    //     const { component } = await setupPagePlaceholderComponent();
    //     expect(component.iconSize).toBe(200);
    //     expect(component.iconVisible).toBeFalsy();
    // });

    // it('should resize for bigger screen', async () => {
    //     setWindowSize();
    //     const { component } = await setupPagePlaceholderComponent();
    //     expect(component.iconSize).toBe(400);
    //     expect(component.iconVisible).toBeTruthy();
    // });

    it('should initialize NO_INFO', async () => {
        const { component } = await setupPagePlaceholderV2Component();
        component.type = PAGE_PLACEHOLDER.NO_INFO;
        component.ngOnInit();

        expect(component.title).toBe(staticLang.placeholderV2Texts.noInfo.title);
        expect(component.message).toBe(staticLang.placeholderV2Texts.noInfo.message);
        expect(component.imagePath).toBe(icons.dirPageV2Placeholder + 'no_info.svg');
    });
});

// BREADCRUMBS
// import { TestBed, ComponentFixture } from '@angular/core/testing';
// import { TranslateService } from '@ngx-translate/core';
//
// import { icons } from '@static-variables';
//
// import { NxPagePlaceholderV2Component } from './page-placeholder.component';
// import { PAGE_PLACEHOLDER } from './page-placeholder.types';
//
// describe('NxPagePlaceholderV2Component', () => {
//     let component: NxPagePlaceholderV2Component;
//     let fixture: ComponentFixture<NxPagePlaceholderV2Component>;
//     let mockTranslateService;
//
//     beforeEach(async () => {
//         mockTranslateService = { instant: jest.fn() };
//
//         await TestBed.configureTestingModule({
//             imports: [NxPagePlaceholderV2Component, icons],
//             providers: [{ provide: TranslateService, useValue: mockTranslateService }],
//         }).compileComponents();
//
//         fixture = TestBed.createComponent(NxPagePlaceholderV2Component);
//         component = fixture.componentInstance;
//         fixture.detectChanges();
//     });
//
//     afterEach(() => {
//         jest.resetAllMocks();
//     });
//
//     it('should create the component', () => {
//         expect(component).toBeTruthy();
//     });
//
//     describe('setupPlaceholder function', () => {
//         it('should update imagePath, title, and message when the type is NO_INFO', () => {
//             mockTranslateService.instant
//                 .mockReturnValueOnce('test title')
//                 .mockReturnValueOnce('test message');
//             component.type = PAGE_PLACEHOLDER.NO_INFO;
//             component.setupPlaceholder();
//
//             expect(component.imagePath).toEqual(icons.dirPageV2Placeholder + 'default.svg');
//             expect(component.title).toEqual('test title');
//             expect(component.message).toEqual('test message');
//         });
//     });
// });

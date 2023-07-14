import {
    BrowserAnimationsModule,
    NoopAnimationsModule,
} from '@angular/platform-browser/animations';
import { ngMocks } from 'ng-mocks';

const mockThirdPartyModules = (): void => {
    ngMocks.globalReplace(BrowserAnimationsModule, NoopAnimationsModule);
};

const mockFirstPartyModules = (): void => {};

export const setupMocks = (): void => {
    mockThirdPartyModules();
    mockFirstPartyModules();
};

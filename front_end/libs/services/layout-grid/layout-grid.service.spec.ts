import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockProvider } from 'ng-mocks';

import { NxCloudApiService } from '@services/nx-cloud-api';

import { NxLayoutGridService } from './layout-grid.service';

vi.mock('../nx-cloud-api', () => ({
    NxCloudApiService: {
        customAccountPropertyFactory: () => null,
    },
}));

const setupLayoutGridService = async (): Promise<NxLayoutGridService> => {
    TestBed.configureTestingModule({
        providers: [
            provideRouter([]),
            MockProvider(NxCloudApiService, {
                customAccountPropertyFactory: () => null,
            }),
        ],
    });
    return TestBed.inject(NxLayoutGridService);
};

describe('NxLayoutGridService', () => {
    let service: NxLayoutGridService;

    beforeEach(async () => {
        service = await setupLayoutGridService();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});

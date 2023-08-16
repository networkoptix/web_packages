import { setupTestBed } from '../src/setup';

import { NxLayoutGridService } from './layout-grid.service';

const setupLayoutGridService = async (): Promise<NxLayoutGridService> => {
    const { inject } = await setupTestBed();
    return inject(NxLayoutGridService);
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

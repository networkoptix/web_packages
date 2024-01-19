import { setupInjectableTestBed } from 'test_utils/test_bed_setup_injectable';
import { v4 as uuid } from 'uuid';

import { SignalsServiceExample } from './signals.service';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const setupSignalsService = () => setupInjectableTestBed(SignalsServiceExample);

describe('SignalsServiceExample', () => {
    it('should create the service', async () => {
        const { service } = await setupSignalsService();
        expect(service).toBeDefined();
    });

    it('should run effects', async () => {
        const { service, detectChanges } = await setupSignalsService();
        const updatedValue = uuid();
        service.state$$.set(updatedValue);

        detectChanges();

        expect(service.state$$()).toEqual(updatedValue);
        expect(service.sideEffect).toEqual(updatedValue);
    });

    it('should calculate computed', async () => {
        const { service } = await setupSignalsService();
        const updatedState = uuid();
        const updatedSeed = uuid();
        const expected = `${updatedState}${updatedSeed}`;
        service.state$$.set(updatedState);
        service.seed$$.set(updatedSeed);

        expect(service.computed$$()).toEqual(expected);
    });
});

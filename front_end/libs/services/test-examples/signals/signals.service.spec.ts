import { TestBed } from '@angular/core/testing';
import { v4 as uuid } from 'uuid';

import { SignalsServiceExample } from './signals.service';

describe('SignalsServiceExample', () => {
    it('should create the service', async () => {
        const service = TestBed.inject(SignalsServiceExample);
        expect(service).toBeDefined();
    });

    it('should run effects', async () => {
        const service = TestBed.inject(SignalsServiceExample);
        const updatedValue = uuid();
        service.state$$.set(updatedValue);

        TestBed.flushEffects();

        expect(service.state$$()).toEqual(updatedValue);
        expect(service.sideEffect).toEqual(updatedValue);
    });

    it('should calculate computed', async () => {
        const service = TestBed.inject(SignalsServiceExample);
        const updatedState = uuid();
        const updatedSeed = uuid();
        const expected = `${updatedState}${updatedSeed}`;
        service.state$$.set(updatedState);
        service.seed$$.set(updatedSeed);

        expect(service.computed$$()).toEqual(expected);
    });
});

import { fakeAsync, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { of } from 'rxjs';

import { NxPollService } from '@services/poll.service';

describe('Poll service', () => {
    let poll: NxPollService;

    beforeEach(waitForAsync(() => {
        poll = TestBed.inject(NxPollService);
    }));

    it('should create the service', () => {
        expect(poll).toBeTruthy();
    });

    it('should create poll and call f()', fakeAsync(() => {
        let count = 0;
        const test = (): void => {
            count++;
        };

        const pollTest = poll.createPoll(() => of(test), 1000);
        // interval delay is irrelevant- just sync with ticks -- TT
        const subscr = pollTest.subscribe(call => {
            call();
        });

        expect(count).toBe(0); // async 'subscr'
        tick(100); // make sure 'test' is called
        expect(count).toBe(1);
        tick(1000);
        expect(count).toBe(2);
        tick(1000);
        expect(count).toBe(3);

        poll.cancel();
        tick(1000);
        expect(count).toBe(3); // check if poll stopped

        subscr.unsubscribe();
    }));
});

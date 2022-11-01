import { waitForAsync, TestBed } from '@angular/core/testing';

import { NxSearchService } from './search.service';
import {
    ButtonArrowType,
    SearchModel
} from './search.service.types';

describe('Search service', () => {
    let search: NxSearchService;

    const modelMock: SearchModel = {
        query: '',
        queryExactMatch: '',
        queryAndMatch: '',
        queryOrMatch: '',
        queryEndsWith: '',
        queryStartsWith: ''
    };

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            providers: []
        });
        search = TestBed.inject(NxSearchService);
    }));

    it('should create the service', () => {
        expect(search).toBeTruthy();
    });

    it('should have setter and getter (navDirection)', () => {
        search.navDirection = ButtonArrowType.up;

        search.navDirectionSubject.subscribe(() => {
            expect(search.navDirection).toBe(ButtonArrowType.up);
        });
    });

    it('should set AND match (single)', () => {
        modelMock.query = 'test';
        search.getMatchPatterns(modelMock);
        expect(modelMock.queryAndMatch).toEqual(['test']);
    });

    it('should set AND match (multiple)', () => {
        modelMock.query = 'test bar baz';
        search.getMatchPatterns(modelMock);
        expect(modelMock.queryAndMatch).toEqual(['test', 'bar', 'baz']);
    });

    it('should set OR match', () => {
        modelMock.query = 'test | bar';
        search.getMatchPatterns(modelMock);
        expect(modelMock.queryOrMatch).toEqual(['test', 'bar']);
    });

    it('should set WILDCARD (ends with) match', () => {
        modelMock.query = '*test';
        search.getMatchPatterns(modelMock);
        expect(modelMock.queryEndsWith).toEqual(['test']);
    });

    it('should set WILDCARD (starts with) match', () => {
        modelMock.query = 'test*';
        search.getMatchPatterns(modelMock);
        expect(modelMock.queryStartsWith).toEqual(['test']);
    });

    it('should set EXACT match', () => {
        modelMock.query = '"test"';
        search.getMatchPatterns(modelMock);
        expect(modelMock.queryExactMatch).toEqual(['test']);
    });

    it('should not find match (AND)', () => {
        modelMock.query = 'test';
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeFalse();
    });

    it('should find match (AND)', () => {
        modelMock.query = 'e l';
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeTrue();
    });

    it('should not find match (OR)', () => {
        modelMock.query = 'b|z';
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeFalse();
    });

    it('should find match (OR)', () => {
        modelMock.query = 'G | L'; // testing case sensitive
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeTrue();
    });

    it('should find match (WILDCARD start)', () => {
        modelMock.query = '*l';
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeTrue();
    });

    it('should find match (WILDCARD ends)', () => {
        modelMock.query = 'Gen*';
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeTrue();
    });

    it('should not find match (EXACT)', () => {
        modelMock.query = '"general"'; // testing case sensitive
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeFalse();
    });

    it('should find match (EXACT)', () => {
        modelMock.query = '"General"';
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeTrue();
    });
});

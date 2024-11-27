import { TestBed } from '@angular/core/testing';

import { NxSearchService } from './search.service';
import { ButtonArrowType, SearchModel } from './search.service.types';

const setupSearchService = async (): Promise<{
    modelMock: SearchModel;
    searchService: NxSearchService;
}> => {
    const searchService = TestBed.inject(NxSearchService);
    const modelMock: SearchModel = {
        query: '',
        queryExactMatch: '',
        queryAndMatch: '',
        queryOrMatch: '',
        queryEndsWith: '',
        queryStartsWith: '',
    };

    return {
        modelMock,
        searchService,
    };
};

describe('Search service', () => {
    it('should create the service', async () => {
        const { searchService: search } = await setupSearchService();
        expect(search).toBeTruthy();
    });

    it('should have setter and getter (navDirection)', async () => {
        const { searchService: search } = await setupSearchService();
        search.navDirection = ButtonArrowType.up;

        search.navDirectionSubject.subscribe(() => {
            expect(search.navDirection).toBe(ButtonArrowType.up);
        });
    });

    it('should set AND match (single)', async () => {
        const { searchService: search, modelMock } = await setupSearchService();
        modelMock.query = 'test';
        search.getMatchPatterns(modelMock);
        expect(modelMock.queryAndMatch).toEqual(['test']);
    });

    it('should set AND match (multiple)', async () => {
        const { searchService: search, modelMock } = await setupSearchService();
        modelMock.query = 'test bar baz';
        search.getMatchPatterns(modelMock);
        expect(modelMock.queryAndMatch).toEqual(['test', 'bar', 'baz']);
    });

    it('should set OR match', async () => {
        const { searchService: search, modelMock } = await setupSearchService();
        modelMock.query = 'test | bar';
        search.getMatchPatterns(modelMock);
        expect(modelMock.queryOrMatch).toEqual(['test', 'bar']);
    });

    it('should set WILDCARD (ends with) match', async () => {
        const { searchService: search, modelMock } = await setupSearchService();
        modelMock.query = '*test';
        search.getMatchPatterns(modelMock);
        expect(modelMock.queryEndsWith).toEqual(['test']);
    });

    it('should set WILDCARD (starts with) match', async () => {
        const { searchService: search, modelMock } = await setupSearchService();
        modelMock.query = 'test*';
        search.getMatchPatterns(modelMock);
        expect(modelMock.queryStartsWith).toEqual(['test']);
    });

    it('should set EXACT match', async () => {
        const { searchService: search, modelMock } = await setupSearchService();
        modelMock.query = '"test"';
        search.getMatchPatterns(modelMock);
        expect(modelMock.queryExactMatch).toEqual(['test']);
    });

    it('should not find match (AND)', async () => {
        const { searchService: search, modelMock } = await setupSearchService();
        modelMock.query = 'test';
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeFalsy();
    });

    it('should find match (AND)', async () => {
        const { searchService: search, modelMock } = await setupSearchService();
        modelMock.query = 'e l';
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeTruthy();
    });

    it('should not find match (OR)', async () => {
        const { searchService: search, modelMock } = await setupSearchService();
        modelMock.query = 'b|z';
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeFalsy();
    });

    it('should find match (OR)', async () => {
        const { searchService: search, modelMock } = await setupSearchService();
        modelMock.query = 'G | L'; // testing case sensitive
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeTruthy();
    });

    it('should find match (WILDCARD start)', async () => {
        const { searchService: search, modelMock } = await setupSearchService();
        modelMock.query = '*l';
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeTruthy();
    });

    it('should find match (WILDCARD ends)', async () => {
        const { searchService: search, modelMock } = await setupSearchService();
        modelMock.query = 'Gen*';
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeTruthy();
    });

    it('should not find match (EXACT)', async () => {
        const { searchService: search, modelMock } = await setupSearchService();
        modelMock.query = '"general"'; // testing case sensitive
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeFalsy();
    });

    it('should find match (EXACT)', async () => {
        const { searchService: search, modelMock } = await setupSearchService();
        modelMock.query = '"General"';
        search.getMatchPatterns(modelMock);

        const result = search.findMatch('General', modelMock);
        expect(result).toBeTruthy();
    });
});

import { createSelector, createFeatureSelector } from '@ngrx/store';

export const selectCount = createFeatureSelector<number>('count');

export const selectCountSquared = createSelector(selectCount, count => count ** 2);

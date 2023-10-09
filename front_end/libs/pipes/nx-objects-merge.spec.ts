import { ObjectsMergePipe } from './nx-objects-merge';

const obj1 = {
    name: 'name1',
    age: 1,
    color: 'red',
};

const obj2 = {
    name: 'name2',
    age: 1,
    looks: 'good',
};

describe('ObjectsMergePipe', () => {
    const mergeObjectsPipe = new ObjectsMergePipe();

    it('should return null if none of parameters are provided', () => {
        expect(mergeObjectsPipe.transform(null, null)).toBe(null);
        expect(mergeObjectsPipe.transform(undefined, undefined)).toBe(null);
        expect(mergeObjectsPipe.transform(null, undefined)).toBe(null);
        expect(mergeObjectsPipe.transform(undefined, null)).toBe(null);
    });

    it('should return first object if second object is empty or undefined', () => {
        expect(mergeObjectsPipe.transform(obj1, null)).toEqual(obj1);
        expect(mergeObjectsPipe.transform(obj1, undefined)).toEqual(obj1);
        expect(mergeObjectsPipe.transform(obj1, {})).toEqual(obj1);
    });

    it('should return second object if first object is empty or undefined', () => {
        expect(mergeObjectsPipe.transform(null, obj2)).toEqual(obj2);
        expect(mergeObjectsPipe.transform(undefined, obj2)).toEqual(obj2);
        expect(mergeObjectsPipe.transform({}, obj2)).toEqual(obj2);
    });

    it('should merge two empty objets into empty object', () => {
        expect(mergeObjectsPipe.transform({}, {})).toEqual({});
    });

    it('should merge two objects', () => {
        expect(mergeObjectsPipe.transform(obj1, obj2)).toEqual({ ...obj1, ...obj2 });
    });
});

// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

export const asyncFind = async <T>(
    array: T[],
    predicate: (t: T) => Promise<boolean>,
): Promise<T | void> => {
    for (const t of array) {
        if (await predicate(t)) {
            return t;
        }
    }
}
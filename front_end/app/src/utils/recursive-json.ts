export const recursiveJson = (value: string, cache = {}) => {
    if (value in cache) {
        return cache[value];
    }
    try {
        const parsed = JSON.parse(value, (_, value) => recursiveJson(value, cache));
        cache[value] = parsed;
    } catch (err) {
        return value;
    }
};

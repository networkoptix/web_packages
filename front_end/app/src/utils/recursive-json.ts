export const recursiveJson = (value: string) => {
    try {
        return JSON.parse(value, (_, value) => recursiveJson(value))
    } catch (err) {
        return value
    }
}
// see https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html
export function assertNever(x: never): never {
    throw new Error('Unexpected object: ' + x);
}

export const BASE64_SINGLE_TRANSPARENT_PIXEL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

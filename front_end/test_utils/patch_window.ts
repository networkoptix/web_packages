/**
 * See https://jestjs.io/docs/manual-mocks#mocking-methods-which-are-not-implemented-in-jsdom
 */
export const patchMatchMedia = (): {
    matchMediaSpy: jest.Mock<Partial<MediaQueryList>, [string]>;
    setMatches: (mockMatches: boolean) => void;
} => {
    let matches = false;

    const setMatches = (mockMatches: boolean): void => {
        matches = mockMatches;
    };

    const matchMediaSpy = jest.fn().mockImplementation(query => ({
        matches,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaSpy,
    });
    return { matchMediaSpy, setMatches };
};

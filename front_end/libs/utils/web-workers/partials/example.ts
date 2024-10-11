export const workerMethods = {
    add: (a: number, b: number) => a + b,
    subtract: (a: number, b: number) => a - b,
    multiply: (a: number, b: number) => a * b,
    divide: (a: number, b: number) => a / b,
    timeMessage: (start: number) => {
        const end = Date.now();
        return `Start: ${start} End: ${end} Duration: ${end - start}`;
    },
    lockThread: async (duration: number) => {
        await new Promise(resolve => setTimeout(resolve, duration));
        return `Thread locked for ${duration}`;
    },
};

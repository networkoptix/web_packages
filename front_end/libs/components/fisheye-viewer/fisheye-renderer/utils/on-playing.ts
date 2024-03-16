export const onPlaying = async (source: HTMLVideoElement): Promise<void> => {
    if (source.paused) {
        await new Promise<void>(resolve =>
            source.addEventListener('play', function reportPlaying() {
                source.removeEventListener('play', reportPlaying);
                resolve();
            }),
        );
    }
};

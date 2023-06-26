This folder will contain self contain features(prevoiusly pages) and should be decoupled so that
they can be run independantly.

When we add module federation you'd be able to run an application with just the app shell and
selected features being served with the rest of the app using cached feature modules.

This library project might be temporary. Currently works for running lint and test targets; build
target will probably need to be handled by making each component into a library which would be
a lot of changes in the file structures which we probably want to avoid for now as not to clutter
git history.

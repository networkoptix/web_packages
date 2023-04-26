# Network Optix Open Source Candidates

## Overview

The `open_candidate` folder is set up identically to the `open` folder with the only changes being
to the contents of the packages and examples folders.

When we identify a package as a candidate for open source they will be moved here first before being
moved to the public `open` folder.

**Moving candidates here first allows us to do a few things:**

- Ensure that our local projects still build after code was packaged up and moved.
- Run open source specific pipeline tasks against candidates.
- Allows us time to do any refactoring before we want to make the code public.
- Enforce separate approval rules between `open_candidate` and `open` folders.
    - `open_candidate` will mostly be our standard approval rules. Focus will be the same as
    regular code reviews.
    - `open` will require additional approvals. Final rules are TBD but most likely will require
    approval from whoever is in charge of our general open source strategy and whoever would be
    in charge of general documentation.

## Process

This is still mostly to be determined but as a general outline.

1. Some existing or new code is identified as a candidate by someone at Network Optix.
2. Request / suggestion is reviewed by web team leads and scope for the package is defined.
3. Upon approval the new package is moved to `open_candidate`.
4. When package is ready a merge request is opened to move to `open`.
5. Once the package has been moved into `open` it will be available publicly on our github.
6. Whenever the `open` folder is synced with our public repo a script will run on CI that will
version and publish any updated packages.

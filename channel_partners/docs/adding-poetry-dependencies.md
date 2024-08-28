# Adding a New Dependency to Poetry

Page

## Introduction

When adding or updating dependencies within the Channel Partner repository using poetry, you need to update the `CP_IMAGE_VERSION` inside the `.gitlab-ci.yml` file located at `channel_partners/build/channel_partners_ci/.gitlab-ci.yml`. This guide will help streamline this process and avoid build failures due to outdated image versions.

## Current Process

The current method involves letting the build fail, reviewing the error message from the job log, manually updating the `CP_IMAGE_VERSION`, committing changes, and pushing them. The failing job is typically named `docker:build-channel-partners`.

Here's an example of a failed build job log containing necessary information:

```
Current image version: 44629
Current merge request id: 43586
Current docker directory: ci/Docker/node-chrome
Please update the IMAGE_VERSION from 44629 to 43586
see ci/Docker/node-chrome/.gitlab-ci.yml
Uploading artifacts for failed job
```

The important section is `Please update the IMAGE_VERSION from 44629 to 43586`. In this example, replace `44629` with `43586` in the `.gitlab-ci.yml` file.

## Simplified Process

To simplify and automate the process of updating the image version, follow these steps:

1. Identify the failing job name (e.g., `docker:build-channel-partners`).
2. Locate the `.gitlab-ci.yml` file in your project directory (`channel_partners/build/channel_partners_ci/.gitlab-ci.yml`).
3. Update the `CP_IMAGE_VERSION` with the correct image version (e.g., replace `44629` with `43586`) as indicated in the error message from the failed job log.
4. Commit and push your changes to the repository.

## Automating Image Version Updates

> In-Progress
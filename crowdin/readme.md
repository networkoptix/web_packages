This folder contains `config.yaml` for the automated [Crowdin](https://translate.networkoptix.com)
integration. An automated Jenkins job reads the list of the translatable branches on the Crowdin
portal, then finds corresponding branches in our repositories and translates them by the config.

Branch naming in the Crowdin is agreed to be like `[nx]vms_5.1_patch`: name of the repository in
the square brackets, name of the branch then, without spaces.

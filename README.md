For development set `CLOUD_PORTAL_CONF_DIR` environment variable (for example, to etc).

## Environment setup on Mac silicon

### Prepare

1. Install homebrew
2. Install required packages
    ```shell
    brew install n pyenv openssl docker docker-compose mysql-client
    ```
3. Install rosetta 2
    ```shell
    /usr/sbin/softwareupdate --install-rosetta --agree-to-license
    ```
4. Add to your rc file.
    ```shell
    LOCAL_ENV=True
    ```

### Installing python requirements
1. Install poetry, https://python-poetry.org/docs/#installation. IMPORTANT. Currently, version 1.5.1 is supported only. 
Preferred method is using system `pip`.

   ```shell
   pip install poetry==1.5.1
   ```
   
2. Installing python.
   3.8.10 for version <=23.3
   3.11.4 for version >23.3
    Run in project root.
    ```shell
    pyenv install 3.8.10
    pyenv install 3.11.4
    # Ensure that pyenv choose version correctly, command has to display path to pyenv python executable    
    pyenv which python    
    ```
3. Install venv 

   Run in project root.
    ```shell
    virtualenv -p $(pyenv which python) env/
    cp etc/virtual_env_template/pip.conf env/
    source env/bin/activate
    ./cloud_helper.sh export_poetry_requirements
    pip install -r cloud/requirements.txt    
    ```
4. Simpler way.
   ```shell
   ./cloud_helper.sh reinstall_virtualenv
   ```
### (Optional) pyenv setup for macos

Add to your rc file 

   ```shell
   # Add pyenv shims
   export PYENV_ROOT="$HOME/.pyenv"
   export PATH="$PYENV_ROOT/shims:$PATH"
   if which pyenv > /dev/null; then eval "$(pyenv init -)"; fi
   ```

### (Optional) Poetry setup

If poetry executable is not found. Add poetry executable path to PATH. For example:

   ```shell
   # Add local bin
   export PATH="$HOME/.local/bin:$PATH"
   ```


### cloud_helper changes

Local licenses generation removed. Licenses are checked in CI build.
Licenses list is generated in docker container build.

`requirements.txt` file is removed. Use `./cloud_helper.sh export_poetry_requirements` 
to generate requirements file or `./cloud_helper.sh setup_env` to install new requirements 

Licenses are available by following links
```
/api/utils/python-licenses/
/api/utils/package-licenses/
```



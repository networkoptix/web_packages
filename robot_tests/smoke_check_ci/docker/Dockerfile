FROM python:3.10.1-buster

COPY robot_tests robot_tests/
WORKDIR /robot_tests

#RUN useradd test_runner && chown -R test_runner /robot_tests
#USER test_runner

# Add robot_tests directory to PATH and PYTHONPATH and set default python to python3
RUN echo "export PATH='$PATH:~/robot_tests:~/robot_tests/NoptixLibrary:~/robot_tests/NoptixImapLibrary'" >> ~/.bashrc \
    && echo "export PYTHONPATH='$PYTHONPATH:~/robot_tests:~/robot_tests/NoptixLibrary:~/robot_tests/NoptixImapLibrary'" >> ~/.bashrc \
    && echo "export alias python=python3" >> ~/.bashrc \
    && . ~/.bashrc

# Add missing packages
RUN chmod 1777 /tmp \
    && apt-get update \
    && apt-get install -y apt-utils  xvfb wget ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
       libatspi2.0-0 libcups2 libdbus-1-3 libgbm1 libgtk-3-0 libnspr4 libnss3 libzbar0 \
       libxcomposite1 libxkbcommon0 libxrandr2 xdg-utils ntpdate openssl

# Install requirements
RUN python -m pip install --upgrade pip && python -m pip install -r requirements.txt


WORKDIR smoke_check_ci
# Saving tests results in smoke_check_ci/test_results
VOLUME /test_results

# Installing chrome and chromedriver: stored in /smoke_check_ci/google_files - MUST be the same version
RUN dpkg -i google_files/*chrome*.deb \
    && rm google_files/*chrome*.deb \
    && cp google_files/chromedriver /usr/local/bin \
    && chmod +rx /usr/local/bin/chromedriver \
    && chmod +rx docker/entrypoint.sh

ENTRYPOINT ["/bin/sh", "-c", "-f", "docker/entrypoint.sh"]

LABEL name="Docker image for cloud portal smoke check tests" \
      maintainer="Kamil Bagautdinov <kamilb@networkoptix.com>"

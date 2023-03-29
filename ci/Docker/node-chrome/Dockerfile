FROM node:16.13.1

ARG CHROME_BIN=/usr/bin/google-chrome
ARG FRONTEND_DIR=/builds/dev/cloud_portal/front_end
ARG FRONTEND_NODE_MODULES=/node_modules_frontend
ARG FRONTEND_CACHE=/.npm_cache
ARG ES_LINT_PLUGIN_NODE_MODULES=/node_modules_es_lint_plugin

RUN npm config set cache "$FRONTEND_CACHE" && npm install -g nx && npm install -g recursive-check-licenses
RUN cd "$FRONTEND_DIR" && npm ci && npm run build-open-libs && cp -r ./node_modules "$FRONTEND_NODE_MODULES"
RUN cd "$FRONTEND_DIR/eslint-plugin-nx" && npm ci && cp -r ./node_modules "$ES_LINT_PLUGIN_NODE_MODULES"
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
RUN apt-get update && apt-get install -y google-chrome-stable && apt-get clean


FROM node:12
# Generated using docker-diary: https://github.com/jonrad/docker-diary/
# Note: This Dockerfile is more optimized for iteration rather than image size
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && \
    apt-get install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common yarn libsecret-1-dev && \
    apt-get clean autoclean && apt-get autoremove --yes

# Jupyter
RUN apt-get update && apt-get install -y jupyter-notebook python3-pip && \
    apt-get clean autoclean && apt-get autoremove --yes

# Jupyter nice to have modules
RUN pip3 install matplotlib

# RStudio
RUN apt-get install -y r-base gdebi-core && \
    wget https://download2.rstudio.org/server/debian9/x86_64/rstudio-server-1.4.1106-amd64.deb && \
    gdebi rstudio-server-1.4.1106-amd64.deb -n && \
    rm rstudio-server-1.4.1106-amd64.deb && \
    apt-get clean autoclean && apt-get autoremove --yes

# R package to allow remote control
RUN R -e "install.packages('rstudioapi', repos='https://cran.rstudio.com/')"

# prepare for theia
RUN mkdir -p /home/theia
WORKDIR /home/theia

# Install dependencies
COPY lerna.json .
COPY package.json .
COPY packages/theia-jupyter-extension/*.json ./packages/theia-jupyter-extension/
COPY packages/theia-rstudio-extension/*.json ./packages/theia-rstudio-extension/
COPY packages/theia-port-proxy-extension/*.json ./packages/theia-port-proxy-extension/
COPY packages/theia-server-proxy-extension/*.json ./packages/theia-server-proxy-extension/
COPY packages/theia-server-proxy-iframe-extension/*.json ./packages/theia-server-proxy-iframe-extension/
COPY packages/theia-server-proxy-list-extension/*.json ./packages/theia-server-proxy-list-extension/
COPY packages/theia-iframe-panels-extension/*.json ./packages/theia-iframe-panels-extension/
COPY packages/browser-app/*.json ./packages/browser-app/

RUN IGNORE_PREPARE=1 yarn install && \
    yarn autoclean --init && \
    yarn autoclean --force && \
    yarn cache clean

# Build the app itself
# Note: Everything after this should be optimized for iteration. Make it build fast
COPY ./ ./
RUN yarn prepare --frozen-lockfile

# Some demo files for the lazy
RUN mkdir -p /home/project && mv demo/* /home/project/ && rm -rf demo

# And away we go
EXPOSE 3000
ENTRYPOINT ["node", "/home/theia/packages/browser-app/src-gen/backend/main.js", "/home/project", "--hostname", "0.0.0.0"]

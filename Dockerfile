FROM node:14
# Generated using docker-diary: https://github.com/jonrad/docker-diary/
# Note: This Dockerfile is more optimized for iteration rather than image size
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && \
    apt-get install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common yarn && \
    apt-get clean autoclean && apt-get autoremove --yes

# Jupyter
RUN apt-get update && apt-get install -y jupyter-notebook && \
    apt-get clean autoclean && apt-get autoremove --yes

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
COPY theia-jupyter-extension/*.json ./theia-jupyter-extension/
COPY theia-rstudio-extension/*.json ./theia-rstudio-extension/
COPY theia-server-proxy-extension/*.json ./theia-server-proxy-extension/
COPY theia-server-proxy-iframe-extension/*.json ./theia-server-proxy-iframe-extension/
COPY theia-server-proxy-list-extension/*.json ./theia-server-proxy-list-extension/
COPY browser-app/*.json ./browser-app/
RUN yarn install && \
    yarn autoclean --init && \
    yarn autoclean --force && \
    yarn cache clean

# Build the app itself
# Note: Everything after this should be optimized for iteration. Make it build fast
COPY ./ ./
# TODO: why is my docker not ignoring these...
RUN rm -rf */node_modules
RUN yarn build --frozen-lockfile

# Some demo files for the lazy
RUN mkdir -p /home/project && mv demo/* /home/project/ && rm -rf demo

# And away we go
EXPOSE 3000
CMD node /home/theia/browser-app/src-gen/backend/main.js /home/project --hostname 0.0.0.0

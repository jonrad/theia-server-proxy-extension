FROM node:14 AS base
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update
RUN apt-get install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common yarn
RUN yarn global add electron

# Jupyter
RUN apt-get install -y jupyter-notebook

# RStudio
RUN apt-get install -y r-base
RUN apt-get install -y gdebi-core
RUN wget https://download2.rstudio.org/server/debian9/x86_64/rstudio-server-1.4.1106-amd64.deb
RUN gdebi rstudio-server-1.4.1106-amd64.deb -n

# FROM base
RUN mkdir -p /app
WORKDIR /app
COPY lerna.json .
COPY package.json .
COPY yarn.lock .
COPY theia-jupyter-extension/*.json ./theia-jupyter-extension/
COPY theia-rstudio-extension/*.json ./theia-rstudio-extension/
COPY theia-server-proxy-extension/*.json ./theia-server-proxy-extension/
COPY theia-server-proxy-iframe-extension/*.json ./theia-server-proxy-iframe-extension/
COPY theia-server-proxy-list-extension/*.json ./theia-server-proxy-list-extension/
COPY ./ ./
RUN yarn

CMD yarn start:browser /home/project --hostname 0.0.0.0

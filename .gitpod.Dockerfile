FROM gitpod/workspace-full

RUN mkdir -p /home/gitpod/theia
WORKDIR /home/gitpod/theia
ARG commitId=b9681010fe56d7fef3da9d9b0fe47260e31a4838
RUN git init && \
  git remote add origin https://github.com/jonrad/theia-server-proxy-extension.git && \
  git fetch --depth 1 origin $commitId && \
  git checkout FETCH_HEAD
RUN yarn

WORKDIR /home/gitpod

RUN echo "node /home/gitpod/theia/browser-app/src-gen/backend/main.js /workspace/theia-server-proxy-extension/demo --port 23000 --hostname 0.0.0.0" >> /home/gitpod/.bashrc

FROM gitpod/workspace-full

RUN mkdir -p /home/gitpod/theia
WORKDIR /home/gitpod/theia
RUN echo ok
ARG commitId=gitpod
RUN git init && \
  git remote add origin https://github.com/jonrad/theia-server-proxy-extension.git && \
  git fetch --depth 1 origin $commitId && \
  git checkout FETCH_HEAD
#RUN yarn

WORKDIR /home/gitpod

RUN echo "bash /home/gitpod/theia/gitpod/install.sh" >> /home/gitpod/.bashrc

# Theia Server Proxy Extension Monorepo

This is a monorepo containing:
* [Theia Server Proxy Extension](./theia-server-proxy-extension) - Library enabling third party web applications to be served via Theia
* [Theia Server Proxy IFrame](./theia-server-proxy-iframe) - Widget/UI elements for generic iframe support in theia
* [Theia Server Proxy List Extension](./theia-server-proxy-list-extension) - UI to show all running server proxies. Optional but useful
* [Theia Jupyter Extension](./theia-jupyter-extension) - Jupyter Notebook extension for Theia
* [Theia RStudio Extension](./theia-rstudio-extension) - RStudio extension for Theia

## Demo

Quick demo:

    docker run -it --rm -p 3000:3000 jonrad/theia-datascience
    # Then go to http://localhost:3000

To use your own files, mount the directory you want to work with:

    docker run -it --rm -p 3000:3000 -v <YOUR_DIRECTORY>:/home/project jonrad/theia-datascience
    # Then go to http://localhost:3000

## Development

Install [nvm](https://github.com/creationix/nvm#install-script).

    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.5/install.sh | bash

Install npm and node.

    nvm install 10
    nvm use 10

Install yarn.

    npm install -g yarn

## Running the browser example

    yarn start:browser

*or:*

    yarn rebuild:browser
    cd browser-app
    yarn start

*or:* launch `Start Browser Backend` configuration from VS code.

Open http://localhost:3000 in the browser.

## Running the Electron example

    yarn start:electron

*or:*

    yarn rebuild:electron
    cd electron-app
    yarn start

*or:* launch `Start Electron Backend` configuration from VS code.

## Developing with the browser example

Start watching all packages, including `browser-app`, of your application with

    yarn watch

*or* watch only specific packages with

    cd theia-server-proxy-extension
    yarn watch

and the browser example.

    cd browser-app
    yarn watch

Run the example as [described above](#Running-the-browser-example)

## Developing with the Electron example

Start watching all packages, including `electron-app`, of your application with

    yarn watch

*or* watch only specific packages with

    cd theia-server-proxy-extension
    yarn watch

and the Electron example.

    cd electron-app
    yarn watch

Run the example as [described above](#Running-the-Electron-example)

## Publishing theia-server-proxy-extension

Create a npm user and login to the npm registry, [more on npm publishing](https://docs.npmjs.com/getting-started/publishing-npm-packages).

    npm login

Publish packages with lerna to update versions properly across local packages, [more on publishing with lerna](https://github.com/lerna/lerna#publish).

    npx lerna publish

## Publishing theia-jupyter-extension

TODO

## Publishing theia-rstudio-extension

TODO

## Roadmap to Publish

* Handle statuses/failures/etc on app start
* Remove all todo 0 and 1s
* Test with different port/url

## Roadmap of nice to haves

* Customizable loading logo
* Fading of loading logo
* Do we really need to include src in the files?
* Add cancellation to stop widget
* Right click on file to open in jupyter/rstudio

## Developing

### Building docker image

    docker build . -t jonrad/theia-datascience

### Iterating with RStudio Server on Mac

It's not worth the effort getting rstudio server to work on mac. So I found it best to just iterate within the docker container. Follow the following steps

Prerequisite: Install https://github.com/sharkdp/fd

Build the docker image from above

In this directory start up the container


    docker run -it --rm -p 3000:3000 $(fd -d 1 | sed "s#^\(.*\)#-v $PWD/\1:/app/\1#" | tr '\n' ' ') jonrad/theia-datascience bash
    yarn start:browser --hostname 0.0.0.0


Now you can still develop locally and even run `yarn watch` but you'll have to start the main app in the docker container

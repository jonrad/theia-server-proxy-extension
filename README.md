# Theia Server Proxy Extension Monorepo

Monorepo containing:
* [Theia Server Proxy Extension](./theia-server-proxy-extension) - Library enabling third party applications to be served via Theia
* [Theia Server Proxy List Extension](./theia-server-proxy-list-extension) - UI to show all running server proxies. Optional but useful
* [Theia Server Proxy IFrame](./theia-server-proxy-iframe) - Widget/UI elements for generic iframe support
* [Theia Jupyter Extension](./theia-jupyter-extension) - Jupyter Notebook extension for Theia
* [Theia RStudio Extension](./theia-rstudio-extension) - RStudio extension for Theia

## Getting started

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
* Change theia version to latest
* Output command text to console/logger
* Test with different port/url

## Roadmap of nice to haves

* Customizable loading logo
* Fading of loading logo
* Do we really need to include src in the files?
* Add cancellation to stop widget
* Right click on file to open in jupyter/rstudio

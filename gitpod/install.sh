sudo chown -R gitpod /theia/theia-app
npm install -g nvm
cp /home/gitpod/theia/gitpod/package.json /theia/theia-app/app/
nvm install 12
nvm use 12
node -v
cd /theia/theia-app
yarn
cp /home/gitpod/theia/gitpod/startup.sh /theia/theia-app/app/
chmod 755 /theia/theia-app/app/startup.sh

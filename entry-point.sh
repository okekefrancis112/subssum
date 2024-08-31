#!/bin/sh

# node ./install.js -f
# npm install phantomjs-prebuilt@2.1.16 --update-binary --force
# npm install phantomjs-prebuilt --force
# npm install -g html-pdf
# npm link html-pdf
# npm link phantomjs-prebuilt
npm uninstall bcrypt
npm install bcrypt
npm install --force
npm run start
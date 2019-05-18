
# Charts backend

Usage:

In one terminal tab:

```sh
$ docker-compose up     # this will start Redis and Ganache
```

In another terminal tab:

```sh
# install NPM packages
$ npm i

# compile and deploy the contract to Ganache
$ cd .. && truffle compile && truffle migrate && cd -

# build the JS bundle used in the temporary webapp
$ npm run build-js

# start the server on port 3000
$ npm start
```


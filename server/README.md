
# Charts demo


## Local development

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

# build the JS bundle used in the demo webapp
$ npm run build-js

# start the server on port 3000
$ npm start
```

## Rinkeby deployment

Define three environment variables (using something like `direnv`, or just the normal way in your shell):
- `RINKEBY_HOST` (something like `https://rinkeby.infura.io/v3/dfkdjfkdjfkj`)
- `DEPLOYMENT_MNEMONIC` (a mnemonic seed phrase)
- `DEPLOYMENT_ADDRESS` (the address, derived from your mnemonic, which you want to use for deploying)

Then run the deployment command and build the backend/frontend bundle, which will include the updated `Chart.json` ABI file:

```sh
$ truffle migrate --network rinkeby
$ ./make.sh
```

`make.sh` produces the file `build/charts-backend.zip`, which you can upload to an AWS Elastic Beanstalk environment.
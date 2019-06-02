const Chart = artifacts.require("Chart");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(Chart, 1, 1);
};

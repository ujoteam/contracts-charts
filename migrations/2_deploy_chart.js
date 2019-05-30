const Chart = artifacts.require("Chart");

module.exports = function(deployer) {
  deployer.deploy(Chart, 1, 1);
};

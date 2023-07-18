const { ethers } = require("hardhat");
const { deployUnirep } = require("@unirep/contracts/deploy/index.js");

module.exports = async () => {
  const [deployer] = await ethers.getSigners();

  console.log(deployer.address);

  await deployUnirep(deployer);
};

module.exports.tags = ["all", "unirep"];

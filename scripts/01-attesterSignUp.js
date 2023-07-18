const { ethers } = require("hardhat");
const { getUnirepContract } = require("@unirep/contracts");
const { EPOCH_LENGTH } = require("../helper-hardhat-config");

async function main() {
  let unirepContract;
  const accounts = await ethers.getSigners();
  const deployer = accounts[0];
  const attester = accounts[1];
  console.log(`deployer: ${deployer.address}`);

  //const defaultProvider = new ethers.providers.Web3Provider(hre.network.provider);

  const unirepAddress = "0xCa61bFcA0107c5952f8bf59f4D510d111cbcE146";
  unirepContract = await getUnirepContract(unirepAddress, ethers.provider);

  //用attester連線,因為註冊時msg.sender必須是attester,connect後面要緊接著function,如果單獨拿出來用,signer還是getUnirepContract的人
  await unirepContract
    .connect(attester)
    .attesterSignUp(EPOCH_LENGTH)
    .then((t) => t.wait());

  const startEpoch = await unirepContract.attesterCurrentEpoch(attester.address);
  console.log(`attester: ${attester.address} startEpoch: ${startEpoch}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

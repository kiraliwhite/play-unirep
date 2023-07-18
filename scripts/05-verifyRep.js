//** userState 參考 create-unirep testapp的  packages/frontend/src/contexts/User.ts */

const { UserState } = require("@unirep/core");
const { defaultProver } = require("@unirep/circuits/provers/defaultProver");
const { getUnirepContract } = require("@unirep/contracts");
const { Identity } = require("@semaphore-protocol/identity");
require("dotenv").config();
const { ethers } = require("hardhat");

async function main() {
  const unirepAddress = "0xCa61bFcA0107c5952f8bf59f4D510d111cbcE146";
  const accounts = await ethers.getSigners();
  const attester = accounts[1];
  const user = accounts[2];

  const unirepContract = getUnirepContract(unirepAddress, attester);

  //先固定用123當作message，用123message還原出user的Identity
  const id = new Identity("123");
  console.log(id);

  const userState = new UserState(
    {
      attesterId: attester.address,
      prover: defaultProver,
      unirepAddress: unirepAddress,
      provider: ethers.provider,
      _id: id,
    },
    id
  );
  await userState.start();
  await userState.waitForSync();

  const data2 = await userState.getData();
  console.log(`userState transition before, this user's reputation: ${data2}`);

  //到目前為止用戶可證明的data,不包含當前epoch收到的reputation
  const provableData2 = await userState.getProvableData();
  console.log(`userState transition before, this user's provableData: ${provableData2}`);

  //如果用戶有5個評價，他可以聲稱他有3個評價，並且證明他有3個評價
  const repProof = await userState.genProveReputationProof({
    minRep: 3,
  });

  //驗證用戶聲稱3個評價是正確的
  console.log(await repProof.verify());

  const { publicSignals, proof } = repProof;

  //其他用戶可以驗證這個評價聲明，如果評價無效則會revert
  const tx = await unirepContract.connect(user).verifyReputationProof(publicSignals, proof);
  await tx.wait();

  console.log("the reputation proof is valid!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

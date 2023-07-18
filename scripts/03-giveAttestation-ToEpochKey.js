//** userState 參考 create-unirep testapp的  packages/frontend/src/contexts/User.ts */

const { UserState } = require("@unirep/core");
const { defaultProver } = require("@unirep/circuits/provers/defaultProver");
const { getUnirepContract } = require("@unirep/contracts");
const { Identity } = require("@semaphore-protocol/identity");
require("dotenv").config();
const { genEpochKey } = require("@unirep/utils");
const { ethers } = require("hardhat");

async function main() {
  const unirepAddress = "0xCa61bFcA0107c5952f8bf59f4D510d111cbcE146";
  const accounts = await ethers.getSigners();
  const attester = accounts[1];

  const unirepContract = getUnirepContract(unirepAddress, attester);

  const startEpoch = await unirepContract.attesterCurrentEpoch(attester.address);
  console.log(`attester: ${attester.address} startEpoch: ${startEpoch}`);

  //先固定用123當作message，用123message還原出user的Identity
  const id = new Identity("123");
  console.log(id);

  const userState = new UserState(
    {
      prover: defaultProver,
      unirepAddress: unirepAddress,
      provider: ethers.provider,
    },
    id
  );
  await userState.start();
  await userState.waitForSync();

  /**
   * 使用@unirep/utils的genEpochKey
   * 或是userState.getEpochKeys
   * 來產生用戶的epochKey
   * 0是nonce
   */
  const epochKey1 = await genEpochKey(id.secret, BigInt(attester.address), startEpoch, 0);
  console.log(`this user's first epochKey: ${epochKey1}`);

  // const epochKey1 = await userState.getEpochKeys(startEpoch, 0);
  // console.log(`this user's first epochKey: ${epochKey1}`);

  //設定要給予的評價，第0欄位，給予5
  const fieldIndex = 0;
  const value = 5;

  //給予epoch key評價,第0欄位,給予5,
  await unirepContract
    .connect(attester)
    .attest(epochKey1, startEpoch, fieldIndex, value)
    .then((t) => t.wait());

  //目前收到的評價，因為鏈上狀態改變，沒有userState.waitForSync()，所以是0
  const data1 = await userState.getData();
  console.log(`userState sync before, this user's reputation: ${data1}`);

  //到目前為止用戶可證明的data,不包含當前epoch收到的reputation，目前沒有經過userStateTransition 所以是0
  const provableData1 = await userState.getProvableData();
  console.log(`userState sync before, this user's provableData: ${provableData1}`);

  //同步鏈上狀態到userState
  await userState.waitForSync();

  //目前收到的評價是5
  const data2 = await userState.getData();
  console.log(`userState sync after, this user's reputation: ${data2}`);

  const provableData2 = await userState.getProvableData();
  console.log(`userState sync after, this user's provableData: ${provableData2}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

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

  const unirepContract = getUnirepContract(unirepAddress, attester);

  const startEpoch = await unirepContract.attesterCurrentEpoch(attester.address);
  console.log(`attester: ${attester.address} startEpoch: ${startEpoch}`);

  /**
   * 建立user的identity
   */

  //用同樣的message(123),會產生相同的identity
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

  //用戶註冊前，userState狀態是false
  const hasSignedUp = await userState.hasSignedUp();
  console.log(`this user hasSignedUp ? : ${hasSignedUp}`);

  //使用userState產生用戶註冊的證明
  const { publicSignals, proof } = await userState.genUserSignUpProof();
  //console.log(`this user signupProof: ${JSON.stringify(signupProof)}`);
  console.log("this user's signupProof publicSignals:");
  console.log(publicSignals);
  //如果同樣的Identity,則publicSignals會相同,但proof不同
  console.log("user's signupProof proof:");
  console.log(proof);
  //每一次的proof都不一樣

  /** 上面產生了user註冊證明後
   * 使用publicSignals,proof去跟unirep合約註冊用戶
   */
  const tx = await unirepContract.connect(attester).userSignUp(publicSignals, proof);
  await tx.wait();

  //因為鏈上狀態改變，所以需要更新userState
  await userState.waitForSync();

  //用戶已註冊
  const hasSignedUp2 = await userState.hasSignedUp();
  console.log(`this user hasSignedUp ? : ${hasSignedUp2}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

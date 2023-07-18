//** userState 參考 create-unirep testapp的  packages/frontend/src/contexts/User.ts */

const { UserState, Synchronizer } = require("@unirep/core");
const { defaultProver } = require("@unirep/circuits/provers/defaultProver");
const { getUnirepContract } = require("@unirep/contracts");
const { Identity } = require("@semaphore-protocol/identity");
require("dotenv").config();
const { ethers } = require("hardhat");
const { EPOCH_LENGTH } = require("../helper-hardhat-config");
const { moveBlocks } = require("../utils/move-blocks");

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

  /**
   * 先宣告Synchronizer,在宣告UserState
   * 或是直接宣告UserState都可以
   */
  const state = new Synchronizer({
    prover: defaultProver,
    provider: ethers.provider,
    unirepAddress: unirepAddress,
  });

  await state.start();
  await state.waitForSync();

  const userState = new UserState(state, id);

  // const userState = new UserState(
  //   {
  //     attesterId: attester.address,
  //     prover: defaultProver,
  //     unirepAddress: unirepAddress,
  //     provider: ethers.provider,
  //     _id: id,
  //   },
  //   id
  // );
  await userState.start();
  await userState.waitForSync();

  const data2 = await userState.getData();
  console.log(`userState transition before, this user's reputation: ${data2}`);

  //到目前為止用戶可證明的data,不包含當前epoch收到的reputation
  const provableData2 = await userState.getProvableData();
  console.log(`userState transition before, this user's provableData: ${provableData2}`);

  console.log("Epoch transition...");

  if (network.config.chainId == "31337") {
    //使用evm_increaseTime推進時間，讓epoch轉換，但這個不會影響userState.sync.calcCurrentEpoch的計算
    await ethers.provider.send("evm_increaseTime", [EPOCH_LENGTH]);
    //推完時間之後，要mine一個block，讓時間推進
    await moveBlocks(2, (sleepAmount = 1000));
  }

  const toEpoch = await unirepContract.attesterCurrentEpoch(attester.address);
  console.log(`attester: ${attester.address} currentEpoch: ${toEpoch}`);

  //因為calcCurrentEpoch是一秒一秒自己計算的，所以用區塊跳過的方式無效，因此還是停留在0
  const calcCurrentEpoch = await state.calcCurrentEpoch();
  console.log(`calcCurrentEpoch: ${calcCurrentEpoch}`);

  console.log("userStateTransition...");
  /**
   * genUserStateTransitionProof的toEpoch預設值是使用calcCurrentEpoch，而我們在上面手動用evm_increaseTime去跳過時間。
   * 因此calcCurrentEpoch一秒一秒計算出來的epoch與現在鏈上的epoch不符，因此會出錯。
   * 所以要手動指定toEpoch。避開錯誤
   * 在epoch轉換之後，用戶可以用genUserStateTransitionProof產生證明，證明他在上一個epoch的評價
   */
  const { proof, publicSignals } = await userState.genUserStateTransitionProof({
    toEpoch: toEpoch,
  });

  // console.log(`proof: ${proof}`);
  // console.log(`publicSignals: ${publicSignals}`);

  //genUserStateTransitionProof產生出來的proof, publicSignals傳遞給unirepContract的userStateTransition做用戶狀態轉換
  const tx = await unirepContract.connect(attester).userStateTransition(publicSignals, proof);
  await tx.wait();

  //鏈上狀態更新後，userState同步
  await userState.waitForSync();

  //能夠證明的評價目前為5
  const provableData3 = await userState.getProvableData();
  console.log(`userState transition after, this user's provableData: ${provableData3}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

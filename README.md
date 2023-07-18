```
yarn install
yarn hardhat node
yarn hardhat run scripts/01-attesterSignUp.js --network localhost
yarn hardhat run scripts/02-userSignUp-simple.js --network localhost
yarn hardhat run scripts/03-giveAttestation-ToEpochKey.js --network localhost
yarn hardhat run scripts/04-userTransition.js --network localhost
yarn hardhat run scripts/05-verifyRep.js --network localhost
```

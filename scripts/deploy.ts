import { ethers } from "hardhat";

async function main() {
  let liquidityTokenAddress ="0x2170ed0880ac9a755fd29b2688956bd959f933f8";
  let rewardTokenAddress ="0x2170ed0880ac9a755fd29b2688956bd959f933f8";
  let startDate = 0; // timestamp
  let numRewardWeeks = 156; 
  let rewardPerPeriod = [] // 156 numbers indicates the reward per week
  // code only for testing purpose , should be replaced by real data
  for(let i = 0; i < 156; i++) {
    rewardPerPeriod.push(1000);
  }
  let Staking = await ethers.getContractFactory("Staking");
  let implementationStaking = await Staking.deploy();
  let ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
  let proxyStaking = await ERC1967Proxy.deploy(implementationStaking.address, "0x");
  let staking = await ethers.getContractAt("Staking", proxyStaking.address);
  await staking.initialize(liquidityTokenAddress, rewardTokenAddress, startDate, numRewardWeeks, rewardPerPeriod);
  console.log(`staking contract deployed to ${staking.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

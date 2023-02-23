import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "solidity-coverage"
import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();
console.log(process.env.PRIVATE_KEY)

const config: HardhatUserConfig = {
  solidity: "0.8.17",
  networks: {
    hardhat: {
    },
    goerli: {
      url: "https://eth-goerli.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY,
      accounts: [process.env.PRIVATE_KEY] 
    },
    prod: { 
      url: "https://eth-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY, //production network
      accounts: [process.env.PRIVATE_KEY] 
    }
  },
};

export default config;

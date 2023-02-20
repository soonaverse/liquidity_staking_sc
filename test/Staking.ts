import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers, network } from "hardhat";

describe("Staking", function () {
  let owner: any;
  let staker1: any;
  let staker2: any;
  let staker3: any;
  let Staking: any;
  let staking: any
  let liquidityToken: any;
  let implementationStaking: any;
  let ERC1967Proxy: any;
  let proxyStaking: any;
  let rewardToken: any;
  let startDate: any;
  const THREE_YEARS = 52 * 3;
  const ONE_WEEK = 60 * 60 * 24 * 7;
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  beforeEach(async function () {

    startDate = 1688212800;
    await network.provider.send("hardhat_reset")
    await network.provider.send("evm_setNextBlockTimestamp", [startDate - 10000])
    await network.provider.send("evm_mine") // this one will have 2023-07-01 12:00 AM as its timestamp, no matter what the previous block has

    // Contracts are deployed using the first signer/account by default
    const [_owner, _staker1, _staker2, _staker3] = await ethers.getSigners();
    owner = _owner;
    staker1 = _staker1;
    staker2 = _staker2;
    staker3 = _staker3;
    Staking = await ethers.getContractFactory("Staking");
    const Token = await ethers.getContractFactory("ERC20Mock");
    liquidityToken = await Token.deploy('Liquidity Token', 'LTKN', staker1.address, ethers.utils.parseEther('1000'));
    await liquidityToken.mint(staker2.address, ethers.utils.parseEther('1000'));
    rewardToken = await Token.deploy('Reward Token', 'RTKN', owner.address, ethers.utils.parseEther('100'));
    implementationStaking = await Staking.deploy();
    ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
    proxyStaking = await ERC1967Proxy.deploy(implementationStaking.address, "0x");
    staking = await ethers.getContractAt("Staking", proxyStaking.address);
    await staking.initialize(liquidityToken.address, rewardToken.address, startDate, THREE_YEARS);
  })

  describe("Deployment", function () {
    it("Should have right initialized variables ", async function () {
      expect(await staking.liquidityToken()).to.equal(liquidityToken.address);
      expect(await staking.rewardToken()).to.equal(rewardToken.address);
      expect(await staking.startDate()).to.equal(startDate);
      expect(await staking.endDate()).to.equal(startDate + (THREE_YEARS) * ONE_WEEK);
    })

    it("failed to initialize staking contract with wrong liquidity address", async function () {
      implementationStaking = await Staking.deploy();
      ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
      proxyStaking = await ERC1967Proxy.deploy(implementationStaking.address, "0x");
      const testStaking = await ethers.getContractAt("Staking", proxyStaking.address);
      await expect(testStaking.initialize(ethers.constants.AddressZero, rewardToken.address, startDate, THREE_YEARS)).to.be.revertedWith('invalid address');
    })

    it("failed to initialize staking contract with wrong reward address", async function () {
      implementationStaking = await Staking.deploy();
      ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
      proxyStaking = await ERC1967Proxy.deploy(implementationStaking.address, "0x");
      const testStaking = await ethers.getContractAt("Staking", proxyStaking.address);
      await expect(testStaking.initialize(liquidityToken.address, ethers.constants.AddressZero, startDate, THREE_YEARS)).to.be.revertedWith('invalid address');
    })

    it("failed to initialize staking contract with wrong rewardPeriods", async function () {
      implementationStaking = await Staking.deploy();
      ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
      proxyStaking = await ERC1967Proxy.deploy(implementationStaking.address, "0x");
      const testStaking = await ethers.getContractAt("Staking", proxyStaking.address);
      await expect(testStaking.initialize(liquidityToken.address, rewardToken.address, startDate, 0)).to.be.revertedWith('invalid rewardPeriods');
    })

    it("failed to initialize staking contract with wrong startDate", async function () {
      implementationStaking = await Staking.deploy();
      ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
      proxyStaking = await ERC1967Proxy.deploy(implementationStaking.address, "0x");
      const testStaking = await ethers.getContractAt("Staking", proxyStaking.address);
      await expect(testStaking.initialize(liquidityToken.address, rewardToken.address, 1, THREE_YEARS)).to.be.revertedWith('invalid startDate');
    })
  });

  describe("Upgradeable", function () {
    it("update contract successfully", async function () {
      const StakingV2 = await ethers.getContractFactory("StakingMockV2");
      const implementationStakingV2 = await StakingV2.deploy();
      await staking.upgradeTo(implementationStakingV2.address);
      const testStaking = await ethers.getContractAt("StakingMockV2", staking.address);
      await testStaking.setNewVariable(10);
      expect(await testStaking.newVariable()).to.equal(10);
    })

    it("fail to update contract due to user not owner", async function () {
      const StakingV2 = await ethers.getContractFactory("StakingMockV2");
      const implementationStakingV2 = await StakingV2.deploy();
      await expect(staking.connect(staker1).upgradeTo(implementationStakingV2.address)).to.be.rejectedWith("Ownable: caller is not the owner");
    })
  })

  describe("Staking", function () {
    describe("scores", function () {
      it("Should have right scores", async function () {
        let weeks = 52;
        let score = 1000 * ((1 / (52 - 1)) * weeks + 2 - 52 * (1 / (52 - 1)))
        expect(await staking.getScore(1000, weeks)).to.be.equal(score);

        weeks = 1;
        score = 1000 * ((1 / (52 - 1)) * weeks + 2 - 52 * (1 / (52 - 1)))
        expect(await staking.getScore(1000, weeks)).to.be.equal(score);


        weeks = 200;
        score = 1000 * ((1 / (52 - 1)) * weeks + 2 - 52 * (1 / (52 - 1)))
        expect(await staking.getScore(1000, weeks)).to.be.equal(parseInt(score, 10));

        weeks = 100;
        score = 1000 * ((1 / (52 - 1)) * weeks + 2 - 52 * (1 / (52 - 1)))
        expect(await staking.getScore(1000, weeks)).to.be.equal(parseInt(score, 10));
      });
    });

    describe("validation", function () {
      it("Validations: amount 0", async function () {
        await expect(staking.connect(staker1).stake(0, 100)).to.be.rejectedWith("amount must be > 0");
      })

      it("Validations: amount not approved", async function () {
        await expect(staking.connect(staker1).stake(100, 100)).to.be.rejectedWith("ERC20: insufficient allowance");
      })

      it("Validations: stake week not valid", async function () {
        await liquidityToken.connect(staker1).approve(staking.address, 100);
        await expect(staking.connect(staker1).stake(100, 0)).to.be.rejectedWith("numWeeks must be > 0");
      })

      it("Validations: stake weeks passes to the end date for staking", async function () {
        await liquidityToken.connect(staker1).approve(staking.address, 100);
        await expect(staking.connect(staker1).stake(100, 500)).to.be.rejectedWith("Staking period exceeds reward period");
      })
      it("Validations: staking period ends already", async function () {
        await liquidityToken.connect(staker1).approve(staking.address, 100);
        await time.increaseTo(startDate + (THREE_YEARS + 1) * ONE_WEEK);
        await expect(staking.connect(staker1).stake(100, 100)).to.be.rejectedWith("Staking has ended");
      })
    });
  });
  describe("staking", function () {
    it("Should stake successfully", async function () {
      let amount = ethers.utils.parseEther('1');
      let weeks = 52
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      expect(await staking.userAvailableTokens(staker1.address, weeks)).to.be.equal(amount);
      expect(await staking.userAvailableTokens(staker1.address, 1)).to.be.equal(0);
      let score = await staking.getScore(amount, weeks);
      for(let i = 0; i < weeks; i++) {
        expect(await staking.userScoresPerPeriod(staker1.address, i)).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }
    })

    it("Should stake successfully multiple times", async function () {
      let amount = ethers.utils.parseEther('1');
      let weeks = 52
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      expect(await staking.userAvailableTokens(staker1.address, weeks)).to.be.equal(amount);
      expect(await staking.userAvailableTokens(staker1.address, 1)).to.be.equal(0);
      let score = await staking.getScore(amount, weeks);
      for(let i = 0; i < weeks; i++) {
        expect(await staking.userScoresPerPeriod(staker1.address, i)).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }

      amount = ethers.utils.parseEther('2');
      weeks = 52
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      expect(await staking.userAvailableTokens(staker1.address, weeks)).to.be.equal(ethers.utils.parseEther('3'));
      score = await staking.getScore(ethers.utils.parseEther('3'), weeks);
      for(let i = 0; i < weeks; i++) {
        expect(await staking.userScoresPerPeriod(staker1.address, i)).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }

    })

    it("Should stake successfully multiple times in multiple periods", async function () {
      let amount = ethers.utils.parseEther('1');
      let weeks = 52
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      expect(await staking.userAvailableTokens(staker1.address, weeks)).to.be.equal(amount);
      expect(await staking.userAvailableTokens(staker1.address, 1)).to.be.equal(0);
      let score = await staking.getScore(amount, weeks);
      for(let i = 0; i < weeks; i++) {
        expect(await staking.userScoresPerPeriod(staker1.address, i)).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }

      // 5 weeks later
      time.setNextBlockTimestamp(startDate + ONE_WEEK * 5);
      await network.provider.send("evm_mine") 

      amount = ethers.utils.parseEther('2');
      weeks = 52
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      score = await staking.getScore(ethers.utils.parseEther('1'), weeks);
      for(let i = 0; i < 5; i++) {
        expect(await staking.userScoresPerPeriod(staker1.address, i)).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }
      score = await staking.getScore(ethers.utils.parseEther('3'), weeks);
      for(let i = 5; i < 52; i++) {
        expect(await staking.userScoresPerPeriod(staker1.address, i)).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }
      score = await staking.getScore(ethers.utils.parseEther('2'), weeks);
      for(let i = 52; i < 57; i++) {
        expect(await staking.userScoresPerPeriod(staker1.address, i)).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }
    })

    it("Should stake successfully multiple times in multiple periods by multiple users", async function () {
      let amount = ethers.utils.parseEther('1');
      let weeks = 52
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      expect(await staking.userAvailableTokens(staker1.address, weeks)).to.be.equal(amount);
      expect(await staking.userAvailableTokens(staker1.address, 1)).to.be.equal(0);
      let score = await staking.getScore(amount, weeks);
      for(let i = 0; i < weeks; i++) {
        expect(await staking.userScoresPerPeriod(staker1.address, i)).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }

      // 5 weeks later
      time.setNextBlockTimestamp(startDate + ONE_WEEK * 5);
      await network.provider.send("evm_mine") 

      amount = ethers.utils.parseEther('2');
      weeks = 52
      await liquidityToken.connect(staker2).approve(staking.address, amount);
      await staking.connect(staker2).stake(amount, weeks);
      let score1 = await staking.getScore(ethers.utils.parseEther('1'), weeks);
      for(let i = 0; i < 5; i++) {
        expect(await staking.userScoresPerPeriod(staker1.address, i)).to.be.equal(score1);
        expect(await staking.userScoresPerPeriod(staker2.address, i)).to.be.equal(0);
        expect(await staking.totalScores(i)).to.be.equal(score1);
      }
      let score2 = await staking.getScore(ethers.utils.parseEther('2'), weeks);
      for(let i = 5; i < 52; i++) {
        expect(await staking.userScoresPerPeriod(staker1.address, i)).to.be.equal(score1);
        expect(await staking.userScoresPerPeriod(staker2.address, i)).to.be.equal(score2);
        expect(await staking.totalScores(i)).to.be.equal(score1.add(score2));
      }
      for(let i = 52; i < 57; i++) {
        expect(await staking.userScoresPerPeriod(staker1.address, i)).to.be.equal(0);
        expect(await staking.userScoresPerPeriod(staker2.address, i)).to.be.equal(score2);
        expect(await staking.totalScores(i)).to.be.equal(score2);
      }
    })
  });
});

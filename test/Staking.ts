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
  let staking: any;
  let liquidityToken: any;
  let implementationStaking: any;
  let ERC1967Proxy: any;
  let proxyStaking: any;
  let rewardToken: any;
  let startDate: any;
  let rewardPerPeriod: any;
  let totalReward: any;
  const THREE_YEARS = 52 * 3;
  const ONE_WEEK = 60 * 60 * 24 * 7;
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  beforeEach(async function () {
    startDate = 1688212800;
    await network.provider.send("hardhat_reset");
    await network.provider.send("evm_setNextBlockTimestamp", [
      startDate - 10000,
    ]);
    await network.provider.send("evm_mine"); // this one will have 2023-07-01 12:00 AM as its timestamp, no matter what the previous block has

    // Contracts are deployed using the first signer/account by default
    const [_owner, _staker1, _staker2, _staker3] = await ethers.getSigners();
    owner = _owner;
    staker1 = _staker1;
    staker2 = _staker2;
    staker3 = _staker3;
    Staking = await ethers.getContractFactory("Staking");
    const Token = await ethers.getContractFactory("ERC20Mock");
    liquidityToken = await Token.deploy(
      "Liquidity Token",
      "LTKN",
      staker1.address,
      ethers.utils.parseEther("1000")
    );
    await liquidityToken.mint(staker2.address, ethers.utils.parseEther("1000"));
    rewardToken = await Token.deploy(
      "Reward Token",
      "RTKN",
      owner.address,
      ethers.utils.parseEther("100")
    );
    implementationStaking = await Staking.deploy();
    ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
    proxyStaking = await ERC1967Proxy.deploy(
      implementationStaking.address,
      "0x"
    );
    staking = await ethers.getContractAt("Staking", proxyStaking.address);
    rewardPerPeriod = [];
    for (let i = 0; i < THREE_YEARS; i++) {
      rewardPerPeriod.push(ethers.utils.parseEther("10"));
    }
    await staking.initialize(
      liquidityToken.address,
      rewardToken.address,
      startDate,
      THREE_YEARS,
      rewardPerPeriod,
      ONE_WEEK
    );
    totalReward = ethers.utils.parseEther(10 * THREE_YEARS + "");
    await rewardToken.mint(staking.address, totalReward);
  });

  describe("Deployment", function () {
    it("Should have right initialized variables ", async function () {
      expect(await staking.liquidityToken()).to.equal(liquidityToken.address);
      expect(await staking.rewardToken()).to.equal(rewardToken.address);
      expect(await staking.startDate()).to.equal(startDate);
      expect(await staking.endDate()).to.equal(
        startDate + THREE_YEARS * ONE_WEEK
      );
    });

    it("failed to initialize staking contract with wrong liquidity address", async function () {
      implementationStaking = await Staking.deploy();
      ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
      proxyStaking = await ERC1967Proxy.deploy(
        implementationStaking.address,
        "0x"
      );
      const testStaking = await ethers.getContractAt(
        "Staking",
        proxyStaking.address
      );
      await expect(
        testStaking.initialize(
          ethers.constants.AddressZero,
          rewardToken.address,
          startDate,
          THREE_YEARS,
          rewardPerPeriod,
          ONE_WEEK
        )
      ).to.be.revertedWith("invalid address");
    });

    it("failed to initialize staking contract with wrong reward address", async function () {
      implementationStaking = await Staking.deploy();
      ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
      proxyStaking = await ERC1967Proxy.deploy(
        implementationStaking.address,
        "0x"
      );
      const testStaking = await ethers.getContractAt(
        "Staking",
        proxyStaking.address
      );
      await expect(
        testStaking.initialize(
          liquidityToken.address,
          ethers.constants.AddressZero,
          startDate,
          THREE_YEARS,
          rewardPerPeriod,
          ONE_WEEK
        )
      ).to.be.revertedWith("invalid address");
    });

    it("failed to initialize staking contract with wrong rewardPeriods", async function () {
      implementationStaking = await Staking.deploy();
      ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
      proxyStaking = await ERC1967Proxy.deploy(
        implementationStaking.address,
        "0x"
      );
      const testStaking = await ethers.getContractAt(
        "Staking",
        proxyStaking.address
      );
      await expect(
        testStaking.initialize(
          liquidityToken.address,
          rewardToken.address,
          startDate,
          0,
          rewardPerPeriod,
          ONE_WEEK
        )
      ).to.be.revertedWith("invalid rewardPeriods");
    });

    it("failed to initialize staking contract with wrong startDate", async function () {
      implementationStaking = await Staking.deploy();
      ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
      proxyStaking = await ERC1967Proxy.deploy(
        implementationStaking.address,
        "0x"
      );
      const testStaking = await ethers.getContractAt(
        "Staking",
        proxyStaking.address
      );
      await expect(
        testStaking.initialize(
          liquidityToken.address,
          rewardToken.address,
          1,
          THREE_YEARS,
          rewardPerPeriod,
          ONE_WEEK
        )
      ).to.be.revertedWith("invalid startDate");
    });

    it("failed to initialize staking contract with wrong rewardToken period and reward per period list length", async function () {
      implementationStaking = await Staking.deploy();
      ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
      proxyStaking = await ERC1967Proxy.deploy(
        implementationStaking.address,
        "0x"
      );
      const testStaking = await ethers.getContractAt(
        "Staking",
        proxyStaking.address
      );
      await expect(
        testStaking.initialize(
          liquidityToken.address,
          rewardToken.address,
          startDate,
          THREE_YEARS - 1,
          rewardPerPeriod,
          ONE_WEEK
        )
      ).to.be.revertedWith("invalid rewardPerPeriodLength");
    });

    it("failed to initialize staking contract with wrong periodLength", async function () {
      implementationStaking = await Staking.deploy();
      ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
      proxyStaking = await ERC1967Proxy.deploy(
        implementationStaking.address,
        "0x"
      );
      const testStaking = await ethers.getContractAt(
        "Staking",
        proxyStaking.address
      );
      await expect(
        testStaking.initialize(
          liquidityToken.address,
          rewardToken.address,
          startDate,
          THREE_YEARS,
          rewardPerPeriod,
          0
        )
      ).to.be.revertedWith("invalid periodLength");
    });
  });

  describe("Upgradeable", function () {
    it("update contract successfully", async function () {
      const StakingV2 = await ethers.getContractFactory("StakingMockV2");
      const implementationStakingV2 = await StakingV2.deploy();
      await staking.upgradeTo(implementationStakingV2.address);
      const testStaking = await ethers.getContractAt(
        "StakingMockV2",
        staking.address
      );
      await testStaking.setNewVariable(10);
      expect(await testStaking.newVariable()).to.equal(10);
    });

    it("fail to update contract due to user not owner", async function () {
      const StakingV2 = await ethers.getContractFactory("StakingMockV2");
      const implementationStakingV2 = await StakingV2.deploy();
      await expect(
        staking.connect(staker1).upgradeTo(implementationStakingV2.address)
      ).to.be.rejectedWith("Ownable: caller is not the owner");
    });
  });

  describe("Staking", function () {
    it("currentPeriod", async function () {
      await expect(staking.getCurrentPeriod()).to.be.revertedWith(
        "Staking not started"
      );
      await time.setNextBlockTimestamp(startDate + 1);
      await network.provider.send("evm_mine");
      expect(await staking.getCurrentPeriod()).to.equal(0);
      await time.setNextBlockTimestamp(startDate + ONE_WEEK * 5);
      await network.provider.send("evm_mine");
      expect(await staking.getCurrentPeriod()).to.equal(5);
      await time.setNextBlockTimestamp(startDate + ONE_WEEK * 20000);
      await network.provider.send("evm_mine");
      expect(await staking.getCurrentPeriod()).to.equal(THREE_YEARS);
    });

    it("currentPeriod after endDate", async function () {
      await time.setNextBlockTimestamp(startDate + 1);
      await network.provider.send("evm_mine");
      expect(await staking.getCurrentPeriod()).to.equal(0);
      await time.setNextBlockTimestamp(await staking.endDate());
      await network.provider.send("evm_mine");
      expect(await staking.getCurrentPeriod()).to.equal(THREE_YEARS);

      await time.setNextBlockTimestamp((await staking.endDate()).add(ONE_WEEK));
      await network.provider.send("evm_mine");
      expect(await staking.getCurrentPeriod()).to.equal(THREE_YEARS);
    });

    describe("scores", function () {
      it("Should have right scores", async function () {
        let weeks = 52;
        let score = 1000 * ((1 / (52 - 1)) * weeks + 2 - 52 * (1 / (52 - 1)));
        expect(await staking.getScore(1000, weeks)).to.be.equal(score);

        weeks = 1;
        score = 1000 * ((1 / (52 - 1)) * weeks + 2 - 52 * (1 / (52 - 1)));
        expect(await staking.getScore(1000, weeks)).to.be.equal(score);

        weeks = 200;
        score = 1000 * ((1 / (52 - 1)) * weeks + 2 - 52 * (1 / (52 - 1)));
        expect(await staking.getScore(1000, weeks)).to.be.equal(
          parseInt(score, 10)
        );

        weeks = 100;
        score = 1000 * ((1 / (52 - 1)) * weeks + 2 - 52 * (1 / (52 - 1)));
        expect(await staking.getScore(1000, weeks)).to.be.equal(
          parseInt(score, 10)
        );
      });
    });

    describe("validation", function () {
      it("Validations: amount 0", async function () {
        await expect(staking.connect(staker1).stake(0, 100)).to.be.rejectedWith(
          "amount must be > 0"
        );
      });

      it("Validations: amount not approved", async function () {
        await expect(
          staking.connect(staker1).stake(100, 100)
        ).to.be.rejectedWith("ERC20: insufficient allowance");
      });

      it("Validations: stake week not valid", async function () {
        await liquidityToken.connect(staker1).approve(staking.address, 100);
        await expect(staking.connect(staker1).stake(100, 0)).to.be.rejectedWith(
          "numPeriods must be > 0"
        );
      });

      it("Validations: stake period not started", async function () {
        await liquidityToken.connect(staker1).approve(staking.address, 100);
        await expect(
          staking.connect(staker1).stake(100, 500)
        ).to.be.rejectedWith("Staking not started");
      });

      it("Validations: stake weeks passes to the end date for staking", async function () {
        await time.setNextBlockTimestamp(startDate + 1);
        await network.provider.send("evm_mine");
        await liquidityToken.connect(staker1).approve(staking.address, 100);
        await expect(
          staking.connect(staker1).stake(100, 500)
        ).to.be.rejectedWith("Staking period exceeds reward period");
      });
      it("Validations: staking period ends already", async function () {
        await liquidityToken.connect(staker1).approve(staking.address, 100);
        await time.increaseTo(startDate + (THREE_YEARS + 1) * ONE_WEEK);
        await expect(
          staking.connect(staker1).stake(100, 100)
        ).to.be.rejectedWith("Staking has ended");
      });
    });
  });
  describe("staking", function () {
    beforeEach(async function () {
      await time.setNextBlockTimestamp(startDate + 1);
      await network.provider.send("evm_mine");
    });

    it("Should stake successfully", async function () {
      let amount = ethers.utils.parseEther("1");
      let weeks = 52;
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      expect(
        await staking.userAvailableTokens(staker1.address, weeks)
      ).to.be.equal(amount);
      expect(await staking.userAvailableTokens(staker1.address, 1)).to.be.equal(
        0
      );
      let score = await staking.getScore(amount, weeks);
      for (let i = 0; i < weeks; i++) {
        expect(
          await staking.userScoresPerPeriod(staker1.address, i)
        ).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }
    });

    it("Should stake successfully multiple times", async function () {
      let amount = ethers.utils.parseEther("1");
      let weeks = 52;
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      expect(
        await staking.userAvailableTokens(staker1.address, weeks)
      ).to.be.equal(amount);
      expect(await staking.userAvailableTokens(staker1.address, 1)).to.be.equal(
        0
      );
      let score = await staking.getScore(amount, weeks);
      for (let i = 0; i < weeks; i++) {
        expect(
          await staking.userScoresPerPeriod(staker1.address, i)
        ).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }

      amount = ethers.utils.parseEther("2");
      weeks = 52;
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      expect(
        await staking.userAvailableTokens(staker1.address, weeks)
      ).to.be.equal(ethers.utils.parseEther("3"));
      score = await staking.getScore(ethers.utils.parseEther("3"), weeks);
      for (let i = 0; i < weeks; i++) {
        expect(
          await staking.userScoresPerPeriod(staker1.address, i)
        ).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }
    });

    it("Should stake successfully multiple times in multiple periods", async function () {
      let amount = ethers.utils.parseEther("1");
      let weeks = 52;
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      expect(
        await staking.userAvailableTokens(staker1.address, weeks)
      ).to.be.equal(amount);
      expect(await staking.userAvailableTokens(staker1.address, 1)).to.be.equal(
        0
      );
      let score = await staking.getScore(amount, weeks);
      for (let i = 0; i < weeks; i++) {
        expect(
          await staking.userScoresPerPeriod(staker1.address, i)
        ).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }

      // 5 weeks later
      await time.setNextBlockTimestamp(startDate + ONE_WEEK * 5);
      await network.provider.send("evm_mine");

      amount = ethers.utils.parseEther("2");
      weeks = 52;
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      score = await staking.getScore(ethers.utils.parseEther("1"), weeks);
      for (let i = 0; i < 5; i++) {
        expect(
          await staking.userScoresPerPeriod(staker1.address, i)
        ).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }
      score = await staking.getScore(ethers.utils.parseEther("3"), weeks);
      for (let i = 5; i < 52; i++) {
        expect(
          await staking.userScoresPerPeriod(staker1.address, i)
        ).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }
      score = await staking.getScore(ethers.utils.parseEther("2"), weeks);
      for (let i = 52; i < 57; i++) {
        expect(
          await staking.userScoresPerPeriod(staker1.address, i)
        ).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }
    });

    it("Should stake successfully multiple times in multiple periods by multiple users", async function () {
      let amount = ethers.utils.parseEther("1");
      let weeks = 52;
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      expect(
        await staking.userAvailableTokens(staker1.address, weeks)
      ).to.be.equal(amount);
      expect(await staking.userAvailableTokens(staker1.address, 1)).to.be.equal(
        0
      );
      let score = await staking.getScore(amount, weeks);
      for (let i = 0; i < weeks; i++) {
        expect(
          await staking.userScoresPerPeriod(staker1.address, i)
        ).to.be.equal(score);
        expect(await staking.totalScores(i)).to.be.equal(score);
      }

      // 5 weeks later
      await time.setNextBlockTimestamp(startDate + ONE_WEEK * 5);
      await network.provider.send("evm_mine");

      amount = ethers.utils.parseEther("2");
      weeks = 52;
      await liquidityToken.connect(staker2).approve(staking.address, amount);
      await staking.connect(staker2).stake(amount, weeks);
      let score1 = await staking.getScore(ethers.utils.parseEther("1"), weeks);
      for (let i = 0; i < 5; i++) {
        expect(
          await staking.userScoresPerPeriod(staker1.address, i)
        ).to.be.equal(score1);
        expect(
          await staking.userScoresPerPeriod(staker2.address, i)
        ).to.be.equal(0);
        expect(await staking.totalScores(i)).to.be.equal(score1);
      }
      let score2 = await staking.getScore(ethers.utils.parseEther("2"), weeks);
      for (let i = 5; i < 52; i++) {
        expect(
          await staking.userScoresPerPeriod(staker1.address, i)
        ).to.be.equal(score1);
        expect(
          await staking.userScoresPerPeriod(staker2.address, i)
        ).to.be.equal(score2);
        expect(await staking.totalScores(i)).to.be.equal(score1.add(score2));
      }
      for (let i = 52; i < 57; i++) {
        expect(
          await staking.userScoresPerPeriod(staker1.address, i)
        ).to.be.equal(0);
        expect(
          await staking.userScoresPerPeriod(staker2.address, i)
        ).to.be.equal(score2);
        expect(await staking.totalScores(i)).to.be.equal(score2);
      }
    });
    it("Should not be able to stake after the end date", async function () {
      await time.setNextBlockTimestamp((await staking.endDate()).add(1));
      await network.provider.send("evm_mine");
      let amount = ethers.utils.parseEther("1");
      let weeks = 52;
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await expect(
        staking.connect(staker1).stake(amount, weeks)
      ).to.be.rejectedWith("Staking has ended");
    });
  });
  describe("withdraw", function () {
    beforeEach(async function () {
      await time.setNextBlockTimestamp(startDate + 1);
      await network.provider.send("evm_mine");
    });
    it("Should withdraw successfully", async function () {
      let amount = ethers.utils.parseEther("1");
      let weeks = 52;
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      expect(
        await staking.userAvailableTokens(staker1.address, weeks)
      ).to.be.equal(amount);
      expect(await staking.userAvailableTokens(staker1.address, 1)).to.be.equal(
        0
      );
      expect(
        await staking.getUnlockedLiquidityForWithdraw(staker1.address)
      ).to.be.equal(0);

      await time.setNextBlockTimestamp(startDate + ONE_WEEK * weeks);
      await network.provider.send("evm_mine");
      expect(
        await staking.getUnlockedLiquidityForWithdraw(staker1.address)
      ).to.be.equal(amount);
      let previousBalance = await liquidityToken.balanceOf(staker1.address);
      await staking.connect(staker1).withdraw(amount);
      expect(await liquidityToken.balanceOf(staker1.address)).to.be.equal(
        previousBalance.add(amount)
      );
      expect(
        await staking.withdrawnLiquidityToken(staker1.address)
      ).to.be.equal(amount);
    });

    it("Should fail if withdrawal amount not available", async function () {
      let amount = ethers.utils.parseEther("1");
      let weeks = 52;
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      expect(
        await staking.userAvailableTokens(staker1.address, weeks)
      ).to.be.equal(amount);
      expect(await staking.userAvailableTokens(staker1.address, 1)).to.be.equal(
        0
      );
      await expect(
        staking.connect(staker1).withdraw(amount)
      ).to.be.revertedWith("amount exceeds available tokens");
    });

    it("Should fail if user hasn't staked", async function () {
      let amount = ethers.utils.parseEther("1");
      let weeks = 52;
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      await expect(
        staking.connect(staker2).withdraw(amount)
      ).to.be.revertedWith("amount exceeds available tokens");
    });

    it("Should fail if user want to withdraw 0 amount", async function () {
      let amount = ethers.utils.parseEther("1");
      let weeks = 52;
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      expect(
        await staking.userAvailableTokens(staker1.address, weeks)
      ).to.be.equal(amount);
      expect(await staking.userAvailableTokens(staker1.address, 1)).to.be.equal(
        0
      );
      expect(
        await staking.getUnlockedLiquidityForWithdraw(staker1.address)
      ).to.be.equal(0);

      await time.setNextBlockTimestamp(startDate + ONE_WEEK * weeks);
      await network.provider.send("evm_mine");
      expect(
        await staking.getUnlockedLiquidityForWithdraw(staker1.address)
      ).to.be.equal(amount);
      let previousBalance = await liquidityToken.balanceOf(staker1.address);
      await expect(staking.connect(staker1).withdraw(0)).to.be.revertedWith(
        "amount must be > 0"
      );
    });

    it("Should withdraw multiple times", async function () {
      let amount = ethers.utils.parseEther("1");
      let weeks = 52;
      await liquidityToken.connect(staker1).approve(staking.address, amount);
      await staking.connect(staker1).stake(amount, weeks);
      expect(
        await staking.userAvailableTokens(staker1.address, weeks)
      ).to.be.equal(amount);
      expect(await staking.userAvailableTokens(staker1.address, 1)).to.be.equal(
        0
      );
      expect(
        await staking.getUnlockedLiquidityForWithdraw(staker1.address)
      ).to.be.equal(0);

      await time.setNextBlockTimestamp(startDate + ONE_WEEK * weeks);
      await network.provider.send("evm_mine");
      expect(
        await staking.getUnlockedLiquidityForWithdraw(staker1.address)
      ).to.be.equal(amount);
      let previousBalance = await liquidityToken.balanceOf(staker1.address);
      await staking.connect(staker1).withdraw(amount.div(2));
      expect(await liquidityToken.balanceOf(staker1.address)).to.be.equal(
        previousBalance.add(amount.div(2))
      );
      await time.setNextBlockTimestamp(startDate + ONE_WEEK * (weeks + 2));
      // get rest of the tokens
      await staking.connect(staker1).withdraw(amount.sub(amount.div(2)));
      expect(await liquidityToken.balanceOf(staker1.address)).to.be.equal(
        previousBalance.add(amount)
      );
      expect(
        await staking.withdrawnLiquidityToken(staker1.address)
      ).to.be.equal(amount);
    });
  });

  describe("claim", function () {
    beforeEach(async function () {
      await time.setNextBlockTimestamp(startDate + 1);
      await network.provider.send("evm_mine");
    });
    it("Should calculate reward correctly", async function () {
      let amountUser1 = ethers.utils.parseEther("1");
      let weeksUser1 = 52;
      await liquidityToken
        .connect(staker1)
        .approve(staking.address, amountUser1);
      await staking.connect(staker1).stake(amountUser1, weeksUser1);

      let amountUser2 = ethers.utils.parseEther("2");
      let weeksUser2 = 104;
      await liquidityToken
        .connect(staker2)
        .approve(staking.address, amountUser2);
      await staking.connect(staker2).stake(amountUser2, weeksUser2);

      for (let i = 0; i < weeksUser1; i++) {
        let scoreUser1 = await staking.getScore(amountUser1, weeksUser1);
        let scoreUser2 = await staking.getScore(amountUser2, weeksUser2);
        let totalScore = await staking.totalScores(i);
        expect(await staking.getRewardByPeriod(staker1.address, i)).to.be.equal(
          scoreUser1.mul(rewardPerPeriod[i]).div(totalScore)
        );
        expect(await staking.getRewardByPeriod(staker2.address, i)).to.be.equal(
          scoreUser2.mul(rewardPerPeriod[i]).div(totalScore)
        );
      }

      for (let i = weeksUser1; i < weeksUser2 - weeksUser1; i++) {
        expect(await staking.getRewardByPeriod(staker1.address, i)).to.be.equal(
          0
        );
        expect(await staking.getRewardByPeriod(staker2.address, i)).to.be.equal(
          rewardPerPeriod[i]
        );
      }

      for (let i = weeksUser2; i < THREE_YEARS; i++) {
        expect(await staking.getRewardByPeriod(staker1.address, i)).to.be.equal(
          0
        );
        expect(await staking.getRewardByPeriod(staker2.address, i)).to.be.equal(
          0
        );
      }
    });

    it("Should should calculate correct available reward", async function () {
      let amountUser1 = ethers.utils.parseEther("1");
      let weeksUser1 = 52;
      await liquidityToken
        .connect(staker1)
        .approve(staking.address, amountUser1);
      await staking.connect(staker1).stake(amountUser1, weeksUser1);

      let amountUser2 = ethers.utils.parseEther("2");
      let weeksUser2 = 104;
      await liquidityToken
        .connect(staker2)
        .approve(staking.address, amountUser2);
      await staking.connect(staker2).stake(amountUser2, weeksUser2);

      expect(await staking.getAvailableReward(staker1.address)).to.be.equal(0);
      expect(await staking.getAvailableReward(staker2.address)).to.be.equal(0);

      let lockTime = 52;
      let accRewardUser1 = ethers.BigNumber.from(0);
      let accRewardUser2 = ethers.BigNumber.from(0);
      for (let i = 0; i < weeksUser1; i++) {
        let scoreUser1 = await staking.getScore(amountUser1, weeksUser1);
        let scoreUser2 = await staking.getScore(amountUser2, weeksUser2);
        let totalScore = await staking.totalScores(i);
        await time.setNextBlockTimestamp(
          startDate + ONE_WEEK * (i + lockTime + 1)
        );
        await network.provider.send("evm_mine");
        accRewardUser1 = accRewardUser1.add(
          scoreUser1.mul(rewardPerPeriod[i]).div(totalScore)
        );
        accRewardUser2 = accRewardUser2.add(
          scoreUser2.mul(rewardPerPeriod[i]).div(totalScore)
        );
        expect(await staking.getAvailableReward(staker1.address)).to.be.equal(
          accRewardUser1
        );
        expect(await staking.getAvailableReward(staker2.address)).to.be.equal(
          accRewardUser2
        );
      }

      for (let i = weeksUser1; i < weeksUser2; i++) {
        await time.setNextBlockTimestamp(
          startDate + ONE_WEEK * (i + lockTime + 1)
        );
        await network.provider.send("evm_mine");
        accRewardUser2 = accRewardUser2.add(rewardPerPeriod[i]);
        expect(await staking.getAvailableReward(staker1.address)).to.be.equal(
          accRewardUser1
        );
        expect(await staking.getAvailableReward(staker2.address)).to.be.equal(
          accRewardUser2
        );
      }

      for (let i = weeksUser2; i < THREE_YEARS; i++) {
        await time.setNextBlockTimestamp(
          startDate + ONE_WEEK * (i + lockTime + 1)
        );
        await network.provider.send("evm_mine");
        expect(await staking.getAvailableReward(staker1.address)).to.be.equal(
          accRewardUser1
        );
        expect(await staking.getAvailableReward(staker2.address)).to.be.equal(
          accRewardUser2
        );
      }
    });

    it("Should claim successfully", async function () {
      let amountUser1 = ethers.utils.parseEther("1");
      let weeksUser1 = 52;
      await liquidityToken
        .connect(staker1)
        .approve(staking.address, amountUser1);
      await staking.connect(staker1).stake(amountUser1, weeksUser1);

      let amountUser2 = ethers.utils.parseEther("2");
      let weeksUser2 = 104;
      await liquidityToken
        .connect(staker2)
        .approve(staking.address, amountUser2);
      await staking.connect(staker2).stake(amountUser2, weeksUser2);

      let lockTime = 52;
      await time.setNextBlockTimestamp(
        startDate + ONE_WEEK * (THREE_YEARS + lockTime + 1)
      );
      await network.provider.send("evm_mine");
      let rewardUser1 = await staking.getAvailableReward(staker1.address);
      await staking.connect(staker1).claimReward(rewardUser1);
      expect(await staking.getAvailableReward(staker1.address)).to.be.equal(
        rewardUser1
      );
      expect(await staking.withdrawnRewardToken(staker1.address)).to.be.equal(
        rewardUser1
      );
      expect(await rewardToken.balanceOf(staker1.address)).to.be.equal(
        rewardUser1
      );
    });

    it("Should be able to claim multiple times", async function () {
      let amountUser1 = ethers.utils.parseEther("1");
      let weeksUser1 = 52;
      await liquidityToken
        .connect(staker1)
        .approve(staking.address, amountUser1);
      await staking.connect(staker1).stake(amountUser1, weeksUser1);

      let amountUser2 = ethers.utils.parseEther("2");
      let weeksUser2 = 104;
      await liquidityToken
        .connect(staker2)
        .approve(staking.address, amountUser2);
      await staking.connect(staker2).stake(amountUser2, weeksUser2);

      let lockTime = 52;
      await time.setNextBlockTimestamp(
        startDate + ONE_WEEK * (THREE_YEARS + lockTime + 1)
      );
      await network.provider.send("evm_mine");
      let rewardUser1 = await staking.getAvailableReward(staker1.address);
      await staking.connect(staker1).claimReward(rewardUser1.div(2));
      expect(await staking.getAvailableReward(staker1.address)).to.be.equal(
        rewardUser1
      );
      expect(await staking.withdrawnRewardToken(staker1.address)).to.be.equal(
        rewardUser1.div(2)
      );
      expect(await rewardToken.balanceOf(staker1.address)).to.be.equal(
        rewardUser1.div(2)
      );

      await staking
        .connect(staker1)
        .claimReward(rewardUser1.sub(rewardUser1.div(2)));
      expect(await staking.getAvailableReward(staker1.address)).to.be.equal(
        rewardUser1
      );
      expect(await staking.withdrawnRewardToken(staker1.address)).to.be.equal(
        rewardUser1
      );
      expect(await rewardToken.balanceOf(staker1.address)).to.be.equal(
        rewardUser1
      );
    });

    it("Should fail to claim 0", async function () {
      let amountUser1 = ethers.utils.parseEther("1");
      let weeksUser1 = 52;
      await liquidityToken
        .connect(staker1)
        .approve(staking.address, amountUser1);
      await staking.connect(staker1).stake(amountUser1, weeksUser1);

      let amountUser2 = ethers.utils.parseEther("2");
      let weeksUser2 = 104;
      await liquidityToken
        .connect(staker2)
        .approve(staking.address, amountUser2);
      await staking.connect(staker2).stake(amountUser2, weeksUser2);

      let lockTime = 52;
      await time.setNextBlockTimestamp(
        startDate + ONE_WEEK * (THREE_YEARS + lockTime + 1)
      );
      await network.provider.send("evm_mine");
      await expect(staking.connect(staker1).claimReward(0)).to.be.rejectedWith(
        "amount must be > 0"
      );
    });

    it("Should fail to claim amount bigger than available", async function () {
      let amountUser1 = ethers.utils.parseEther("1");
      let weeksUser1 = 52;
      await liquidityToken
        .connect(staker1)
        .approve(staking.address, amountUser1);
      await staking.connect(staker1).stake(amountUser1, weeksUser1);

      let amountUser2 = ethers.utils.parseEther("2");
      let weeksUser2 = 104;
      await liquidityToken
        .connect(staker2)
        .approve(staking.address, amountUser2);
      await staking.connect(staker2).stake(amountUser2, weeksUser2);

      let lockTime = 52;
      await time.setNextBlockTimestamp(
        startDate + ONE_WEEK * (THREE_YEARS + lockTime + 1)
      );
      await network.provider.send("evm_mine");
      let rewardUser1 = await staking.getAvailableReward(staker1.address);
      await staking.connect(staker1).claimReward(rewardUser1.div(2));
      await expect(
        staking
          .connect(staker1)
          .claimReward(rewardUser1.sub(rewardUser1.div(2)) + 1)
      ).to.be.rejectedWith("amount exceeds available reward tokens");
    });

    it.only("Should not fail to claim even if user has passed long time after the staking finished", async function () {
      let amountUser1 = ethers.utils.parseEther("1");
      let weeksUser1 = 52;
      await liquidityToken
        .connect(staker1)
        .approve(staking.address, amountUser1);
      await staking.connect(staker1).stake(amountUser1, weeksUser1);

      let amountUser2 = ethers.utils.parseEther("2");
      let weeksUser2 = 104;
      await liquidityToken
        .connect(staker2)
        .approve(staking.address, amountUser2);
      await staking.connect(staker2).stake(amountUser2, weeksUser2);

      let lockTime = 52;
      await time.setNextBlockTimestamp(
        startDate + ONE_WEEK * (THREE_YEARS * 1000 + lockTime + 1) // 3000 years later
      );
      await network.provider.send("evm_mine");
      let rewardUser1 = await staking.getAvailableReward(staker1.address);
      await staking.connect(staker1).claimReward(rewardUser1);
      expect(await staking.getAvailableReward(staker1.address)).to.be.equal(
        rewardUser1
      );
      expect(await staking.withdrawnRewardToken(staker1.address)).to.be.equal(
        rewardUser1
      );
      expect(await rewardToken.balanceOf(staker1.address)).to.be.equal(
        rewardUser1
      );
    });
  });
});

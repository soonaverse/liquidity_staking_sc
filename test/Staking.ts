import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("Staking", function () {
  let owner: any;
  let staker1: any;
  let staker2: any;
  let staker3: any;
  let staking: any
  let liquidityToken: any;
  let rewardToken: any;
  let startDate: any;
  const THREE_YEARS = 52 * 3;
  const ONE_WEEK = 60 * 60 * 24 * 7;
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployStakingContract() {

    // Contracts are deployed using the first signer/account by default
    const [owner, staker1, staker2, staker3] = await ethers.getSigners();

    const Staking = await ethers.getContractFactory("Staking");
    startDate = (await time.latest()) + 1000;
    const Token = await ethers.getContractFactory("ERC20Mock");
    liquidityToken = await Token.deploy('Liquidity Token', 'LTKN', owner.address, 1000000);
    rewardToken = await Token.deploy('Reward Token', 'RTKN', owner.address, 1000000);
    const staking = await Staking.deploy(liquidityToken.address, rewardToken.address, startDate, THREE_YEARS);

    return staking;
  }

  describe("Deployment", function () {
    it("Should have right initialized variables ", async function () {
      staking = await loadFixture(deployStakingContract);
      expect(await staking.liquidityToken()).to.equal(liquidityToken.address);
      expect(await staking.rewardToken()).to.equal(rewardToken.address);
      expect(await staking.startDate()).to.equal(startDate);
      expect(await staking.startDate()).to.equal(startDate);
      expect(await staking.endDate()).to.equal(startDate + (THREE_YEARS) * ONE_WEEK);
    })
  });

  /*
  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {
      const { lock, unlockTime } = await loadFixture(deployOneYearLockFixture);

      expect(await lock.unlockTime()).to.equal(unlockTime);
    });

    it("Should set the right owner", async function () {
      const { lock, owner } = await loadFixture(deployOneYearLockFixture);

      expect(await lock.owner()).to.equal(owner.address);
    });

    it("Should receive and store the funds to lock", async function () {
      const { lock, lockedAmount } = await loadFixture(
        deployOneYearLockFixture
      );

      expect(await ethers.provider.getBalance(lock.address)).to.equal(
        lockedAmount
      );
    });

    it("Should fail if the unlockTime is not in the future", async function () {
      // We don't use the fixture here because we want a different deployment
      const latestTime = await time.latest();
      const Lock = await ethers.getContractFactory("Lock");
      await expect(Lock.deploy(latestTime, { value: 1 })).to.be.revertedWith(
        "Unlock time should be in the future"
      );
    });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert with the right error if called too soon", async function () {
        const { lock } = await loadFixture(deployOneYearLockFixture);

        await expect(lock.withdraw()).to.be.revertedWith(
          "You can't withdraw yet"
        );
      });

      it("Should revert with the right error if called from another account", async function () {
        const { lock, unlockTime, otherAccount } = await loadFixture(
          deployOneYearLockFixture
        );

        // We can increase the time in Hardhat Network
        await time.increaseTo(unlockTime);

        // We use lock.connect() to send a transaction from another account
        await expect(lock.connect(otherAccount).withdraw()).to.be.revertedWith(
          "You aren't the owner"
        );
      });

      it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
        const { lock, unlockTime } = await loadFixture(
          deployOneYearLockFixture
        );

        // Transactions are sent using the first signer by default
        await time.increaseTo(unlockTime);

        await expect(lock.withdraw()).not.to.be.reverted;
      });
    });

    describe("Events", function () {
      it("Should emit an event on withdrawals", async function () {
        const { lock, unlockTime, lockedAmount } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        await expect(lock.withdraw())
          .to.emit(lock, "Withdrawal")
          .withArgs(lockedAmount, anyValue); // We accept any value as `when` arg
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        const { lock, unlockTime, lockedAmount, owner } = await loadFixture(
          deployOneYearLockFixture
        );

        await time.increaseTo(unlockTime);

        await expect(lock.withdraw()).to.changeEtherBalances(
          [owner, lock],
          [lockedAmount, -lockedAmount]
        );
      });
    });
  });
  */
});

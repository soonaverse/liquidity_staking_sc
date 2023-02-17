// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

/*
    0-1-2 ---- week 156 staking period
      1-2 -----  week 156 staked token is available for withdraw
            week53-54-55 -----  week 208(156+52) reward is available for withdraw

*/
contract Staking is ReentrancyGuard {
    address public liquidityToken;
    address public rewardToken;
    uint256 public startDate; // start date of staking, the first reward distribution is 1 week after start date
    uint256 public endDate; // the time for last reward distribution, staking is not allowed after this time
    uint256 public rewardPeriods; // number of reward periods
    uint256[] public totalScores; // total scores per period
    uint256[] public rewardPerPeriod; // user scores per period
    uint256 public constant lockTime = 52 weeks; // 1 year lock time for rewardToken
    mapping (address => uint256) public withdrawnLiquidityToken; // amount of liquidity tokens withdrawn by user
    mapping (address => uint256) public withdrawnRewardToken; // amount of reward tokens withdrawn by user
    mapping(address => mapping(uint256 => uint256)) public userScoresPerPeriod; // user scores per period
    mapping(address => mapping(uint256 => uint256)) public userAvailableTokens; // user available liquidity token for withdraw per period

    /**
     * @dev Constructor
     * @param _liquidityToken address of liquidity token
     * @param _rewardToken address of reward token
     * @param _startDate start date of staking, the first reward distribution is 1 week after start date
     * @param _rewardPeriods number of reward periods
     */
    constructor(address _liquidityToken, address _rewardToken, uint256 _startDate, uint256 _rewardPeriods) {
        require(_liquidityToken != address(0), 'invalid address');
        require(_rewardToken != address(0), 'invalid address');
        require(_rewardPeriods > 0, 'invalid rewardPeriods');
        require(_startDate >= block.timestamp, 'invalid startDate');
        liquidityToken = _liquidityToken;
        rewardToken = _rewardToken;
        // first reward distribution is 1 week after start date
        startDate = _startDate;

        rewardPeriods = _rewardPeriods;
        endDate = startDate + _rewardPeriods * 1 weeks;
        totalScores = new uint256[](_rewardPeriods);
    }

    /**
     * @dev stake liquidity tokens
     * @param amount amount of liquidity tokens to stake
     * @param numWeeks number of weeks to stake
     */
    function stake(uint256 amount, uint256 numWeeks) external {
        // transfer liquidity tokens from msg.sender to this contract
        require(amount > 0, "amount must be > 0");
        IERC20(liquidityToken).transferFrom(msg.sender, address(this), amount);
        // increase reward scores for user
        address user = msg.sender;
        uint256 currentPeriod = increaseRewardScores(user, amount, numWeeks);
        // lock liquidity token to be available for withdraw after 
        userAvailableTokens[user][currentPeriod + numWeeks] += amount;
        // emit a Staked event
    }

    /** 
     * @dev withdraw liquidity tokens, only available after lockTime
     * @param user address of user
     * @return availableTokens amount of liquidity tokens available for withdraw
     */
    function getUnlockedLiquidityForWithdraw(address user) public view returns(uint256 availableTokens) {
        if (block.timestamp < startDate) {
            return 0;
        }
        uint256 currentPeriod = getCurrentPeriod();

        // all staked liquidity will be freed after last period
        for (uint256 i = 0; i < currentPeriod + 1; i++) {
            if (userAvailableTokens[user][i] > 0) {
                availableTokens += userAvailableTokens[user][i];
            }
        }
        return availableTokens;
    }

    /**
     * @dev withdraw liquidity tokens, only available after final of its staking period
     * @param amount amount of liquidity tokens to withdraw
     */

    function withdraw(uint256 amount) nonReentrant external {
        // transfer liquidity tokens from this contract to msg.sender
        require(amount > 0, "amount must be > 0");
        uint256 unlockedTokens = getUnlockedLiquidityForWithdraw(msg.sender);
        require(amount <= unlockedTokens - withdrawnLiquidityToken[msg.sender], "amount exceeds available tokens");

        withdrawnLiquidityToken[msg.sender] += amount;
        IERC20(liquidityToken).transfer(msg.sender, amount);

        // emit a Withdrawn event
    }

    /**
     * @dev claim reward tokens, only available after locktime
     * @param amount amount of reward tokens to claim
     */
    function claimReward(uint256 amount) nonReentrant external {
        require(amount > 0, "amount must be > 0");

        uint256 unlockedTokens = getUnlockedLiquidityForWithdraw(msg.sender);
        require(amount <= unlockedTokens - withdrawnRewardToken[msg.sender], "amount exceeds available reward tokens");
        withdrawnRewardToken[msg.sender] += amount;

        IERC20(rewardToken).transfer(msg.sender, amount);
    }

    /**
     * @dev get reward scores for user for a period
     * @param user address of user
     * @param period period
     * @return reward number of reward tokens for user
     */
    function getRewardByPeriod(address user, uint256 period) public view returns(uint256 reward) {
        uint256 score = userScoresPerPeriod[user][period];
        if (score == 0) {
            return 0;
        }
        return score * rewardPerPeriod[period] / totalScores[period];
    }

    /**
     * @dev get total available reward tokens for user
     * @param user address of user
     * @return availableReward number of reward tokens available for user
     */
    function getAvailableReward(address user) public view returns(uint256 availableReward) {
        // current time is at least 52 weeks(reward lock time) after the first reward distribution date
        if (block.timestamp - lockTime < startDate + 1 weeks) {
            return 0;
        }

        uint256 currentAvailableRewardPeriod = (block.timestamp - lockTime - startDate) / 1 weeks;
        for (uint256 i = 0; i < currentAvailableRewardPeriod; i++) {
            availableReward += getRewardByPeriod(user, i);
        }
    }
    
    /**
     * @dev get multiplier point based on number of weeks staked
     * @param numPeriod number of weeks staked
     * @return multiplier point
     */
    function getMultiplier(uint256 numPeriod) public pure returns(uint256) {
        // Y = MX + B
        // Y = Multiplier
        // M = 1 / (52-1)
        // X = weeks staked/locked
        // B = 2 - M * 52
        uint256 precision = 10e18;
        uint256 m = (precision / (52 -1));
        uint256 b = 2 * precision - 52 * m;
        uint256 y = (m * numPeriod + b) / precision;
        return y;
    }
    
    /**
     * @dev get score based on amount and number of weeks staked
     * @param amount amount of liquidity tokens staked
     * @param numWeeks number of weeks staked
     * @return score
     */
    function getScore(uint256 amount, uint256 numWeeks) public pure returns (uint256) {
        return amount * getMultiplier(numWeeks);
    }

    /**
     * @dev increase reward scores for user
     * @param user address of user
     * @param amount amount of liquidity tokens staked
     * @param numWeeks number of weeks staked
     * @return currentPeriod current period
     */
    function increaseRewardScores(address user, uint256 amount, uint256 numWeeks) internal returns(uint256 currentPeriod) {
        require(block.timestamp <= endDate + 1 weeks, "Staking has ended");
        if (block.timestamp >= startDate) {
            currentPeriod = getCurrentPeriod();
        }

        require(currentPeriod + numWeeks <= rewardPeriods, "Staking period exceeds reward period");
        uint256 score = getScore(amount, numWeeks);
        for (uint256 i = 0; i < numWeeks; i++) {
            totalScores[currentPeriod + i] += score;
            userScoresPerPeriod[user][currentPeriod + i] += score;
        }
    }

    /*
    * @dev get current period, before start date + 1 weeks is 0
    * @return currentPeriod current period
    */
    function getCurrentPeriod() public view returns (uint256) {
        if (block.timestamp < startDate) {
            return 0;
        } else if (block.timestamp >= endDate + 1 weeks){
            return rewardPeriods;
        } else {
            return (block.timestamp - startDate) / 1 weeks;
        }
    }
}
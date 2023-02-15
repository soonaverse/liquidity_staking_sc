// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract Staking is ReentrancyGuard {
    address public liquidityToken;
    address public rewardToken;
    uint256 public startDate; // start date of staking, the first reward distribution is 1 week after start date
    uint256 public endDate; // the time for last reward distribution, staking is not allowed after this time
    uint256 public rewardPeriods; // number of reward periods
    uint256[] public totalScores; // total scores per period
    uint256 public constant lockTime = 52 weeks; // 1 year lock time for rewardToken
    mapping (address => uint256) public withdrawnLiquidityToken; // amount of liquidity tokens withdrawn by user
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
        liquidityToken = _liquidityToken;
        rewardToken = _rewardToken;
        // first reward distribution is 1 week after start date
        startDate = _startDate;
        endDate = startDate + rewardPeriods * 1 weeks;
        rewardPeriods = _rewardPeriods;
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
     * @param amount amount of liquidity tokens to withdraw
     */
    function getUnlockedLiquidityForWithdraw(address user) public view returns(uint256 availableTokens) {
        if (block.timestamp < startDate) {
            return 0;
        }
        uint256 currentPeriod = getCurrentPeriod();

        // all staked liquidity will be freed after last period
        for (uint256 i = 0; i < rewardPeriods + 1; i++) {
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

    
    function getScore(uint256 amount, uint256 numWeeks) public pure returns (uint256) {
        // #TODO apply real formule
        return amount / numWeeks;
    }

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
// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/*
    0-1-2 ---- week 156 staking period
      1-2 -----  week 156 staked token is available for withdraw
            week53-54-55 -----  week 208(156+52) reward is available for withdraw

*/
contract Staking is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable {
    address public owner;
    address public liquidityToken;
    address public rewardToken;
    uint256 public startDate; // start date of staking, the first reward distribution is 1 week after start date
    uint256 public endDate; // the time for last reward distribution, staking is not allowed after this time
    uint256 public rewardPeriods; // number of reward periods
    uint256[] public totalScores; // total scores per period
    uint256[] public rewardPerPeriod; // user scores per period
    uint256 public constant lockTime = 52 weeks; // 1 year lock time for rewardToken
    uint256 public periodLength; // should be 1 week in prod
    mapping (address => uint256) public withdrawnLiquidityToken; // amount of liquidity tokens withdrawn by user
    mapping (address => uint256) public withdrawnRewardToken; // amount of reward tokens withdrawn by user
    mapping(address => mapping(uint256 => uint256)) public userScoresPerPeriod; // user scores per period
    mapping(address => mapping(uint256 => uint256)) public userAvailableTokens; // user available liquidity token for withdraw per period

    /**
     * @dev initialize
     * @param _liquidityToken address of liquidity token
     * @param _rewardToken address of reward token
     * @param _startDate start date of staking, the first reward distribution is 1 week after start date
     * @param _rewardPeriods number of reward periods
     */
    function initialize(address _liquidityToken, address _rewardToken, uint256 _startDate, uint256 _rewardPeriods, uint256[] memory _rewardPerPeriod, uint256 _periodLength) public initializer {
        __ReentrancyGuard_init();
        owner = msg.sender; 
        require(_liquidityToken != address(0), 'invalid address');
        require(_rewardToken != address(0), 'invalid address');
        require(_rewardPeriods > 0, 'invalid rewardPeriods');
        require(_startDate >= block.timestamp, 'invalid startDate');
        require(_rewardPerPeriod.length == _rewardPeriods, 'invalid rewardPerPeriodLength');
        require(_periodLength > 0, 'invalid periodLength');

        liquidityToken = _liquidityToken;
        rewardToken = _rewardToken;
        // first reward distribution is 1 week after start date
        startDate = _startDate;

        rewardPeriods = _rewardPeriods;
        endDate = startDate + _rewardPeriods * _periodLength;
        totalScores = new uint256[](_rewardPeriods);
        rewardPerPeriod = _rewardPerPeriod;
        periodLength = _periodLength;
    }

    /**
     * @dev stake liquidity tokens
     * @param amount amount of liquidity tokens to stake
     * @param numPeriods number of weeks to stake
     */
    function stake(uint256 amount, uint256 numPeriods) external {
        address user = msg.sender;
        // transfer liquidity tokens from msg.sender to this contract
        require(amount > 0, "amount must be > 0");
        require(IERC20Upgradeable(liquidityToken).transferFrom(user, address(this), amount), "transfer liquidity failed");
        require(numPeriods > 0, "numPeriods must be > 0");
        // increase reward scores for user
        uint256 currentPeriod = increaseRewardScores(user, amount, numPeriods);
        // lock liquidity token to be available for withdraw after 
        userAvailableTokens[user][currentPeriod + numPeriods] += amount;
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
        IERC20Upgradeable(liquidityToken).transfer(msg.sender, amount);

        // emit a Withdrawn event
    }

    /**
     * @dev claim reward tokens, only available after locktime
     * @param amount amount of reward tokens to claim
     */
    function claimReward(uint256 amount) nonReentrant external {
        require(amount > 0, "amount must be > 0");

        uint256 unlockedTokens = getAvailableReward(msg.sender);
        require(amount <= unlockedTokens - withdrawnRewardToken[msg.sender], "amount exceeds available reward tokens");
        withdrawnRewardToken[msg.sender] += amount;

        IERC20Upgradeable(rewardToken).transfer(msg.sender, amount);
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
        if (block.timestamp - lockTime < startDate + periodLength) {
            return 0;
        }

        uint256 currentAvailableRewardPeriod = (block.timestamp - lockTime - startDate) / periodLength;
        for (uint256 i = 0; i < currentAvailableRewardPeriod; i++) {
            availableReward += getRewardByPeriod(user, i);
        }
    }
    
    /**
     * @dev get score based on amount and number of weeks staked
     * @param amount amount of liquidity tokens staked
     * @param numPeriods number of weeks staked
     * @return score
     */
    function getScore(uint256 amount, uint256 numPeriods) public pure returns (uint256) {
        // Y = MX + B
        // Y = Multiplier
        // M = 1 / (52-1)
        // X = weeks staked/locked
        // B = 2 - M * 52
        uint256 precision = 10e18;
        uint256 m = (precision / (52 -1));
        uint256 b = 2 * precision - 52 * m;
        return amount * (m * numPeriods + b) / precision;
    }

    /**
     * @dev increase reward scores for user
     * @param user address of user
     * @param amount amount of liquidity tokens staked
     * @param numPeriods number of weeks staked
     * @return currentPeriod current period
     */
    function increaseRewardScores(address user, uint256 amount, uint256 numPeriods) internal returns(uint256 currentPeriod) {
        require(block.timestamp <= endDate + periodLength, "Staking has ended");
        if (block.timestamp >= startDate) {
            currentPeriod = getCurrentPeriod();
        }

        require(currentPeriod + numPeriods <= rewardPeriods, "Staking period exceeds reward period");
        uint256 score = getScore(amount, numPeriods);
        for (uint256 i = 0; i < numPeriods; i++) {
            totalScores[currentPeriod + i] += score;
            userScoresPerPeriod[user][currentPeriod + i] += score;
        }
    }

    /*
    * @dev get current period, before start date + periodLength is 0
    * @return currentPeriod current period
    */
    function getCurrentPeriod() public view returns (uint256) {
        if (block.timestamp < startDate) {
            return 0;
        } else if (block.timestamp >= endDate + periodLength){
            return rewardPeriods;
        } else {
            return (block.timestamp - startDate) / periodLength;
        }
    }

    // solhint-disable-next-line no-unused-vars
    function _authorizeUpgrade(address newImplementation) internal virtual override {
        require(owner == msg.sender, "Ownable: caller is not the owner");
    }
}
// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../Staking.sol";
/*
    0-1-2 ---- week 156 staking period
      1-2 -----  week 156 staked token is available for withdraw
            week53-54-55 -----  week 208(156+52) reward is available for withdraw

*/
contract StakingMockV2 is Staking {
    uint256 public newVariable; 

    function setNewVariable(uint256 _newVariable) public {
        newVariable = _newVariable;
    }
}
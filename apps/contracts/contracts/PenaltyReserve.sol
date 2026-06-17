// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PenaltyReserve is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public factory;
    uint256 public totalPenalties;

    event FactorySet(address indexed factory);
    event PenaltyReceived(uint256 amount);
    event PoolMigrated(address newContract, uint256 amount);
    event TokensRescued(address indexed token, address indexed to, uint256 amount);
    event CeloRescued(address indexed to, uint256 amount);

    error Unauthorized();
    error InvalidAddress();
    error FactoryAlreadySet();
    error NativeTransferFailed();

    constructor(address _token, address initialOwner) Ownable(initialOwner) {
        if (_token == address(0) || initialOwner == address(0)) revert InvalidAddress();
        token = IERC20(_token);
    }

    function setFactory(address _factory) external onlyOwner {
        if (_factory == address(0)) revert InvalidAddress();
        if (factory != address(0) && totalPenalties > 0) revert FactoryAlreadySet();
        factory = _factory;
        emit FactorySet(_factory);
    }

    function receivePenalty(uint256 amount) external {
        if (msg.sender != factory) revert Unauthorized();
        totalPenalties += amount;
        emit PenaltyReceived(amount);
    }

    function migrate(address newContract) external onlyOwner {
        if (newContract == address(0)) revert InvalidAddress();
        uint256 amount = token.balanceOf(address(this));
        token.safeTransfer(newContract, amount);
        emit PoolMigrated(newContract, amount);
    }

    function rescueTokens(
        address tokenAddress,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        if (tokenAddress == address(token)) revert InvalidAddress();
        IERC20(tokenAddress).safeTransfer(to, amount);
        emit TokensRescued(tokenAddress, to, amount);
    }

    function rescueCELO(address payable to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert NativeTransferFailed();
        emit CeloRescued(to, amount);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PenaltyReserve} from "./PenaltyReserve.sol";

contract PiggyBankFactory is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public BASE_PENALTY_BPS = 800;

    struct Vault {
        string label;
        uint256 goalAmount;
        uint256 deadline;
        uint256 createdAt;
        uint256 deposited;
        bool withdrawn;
    }

    address public immutable token;
    address public immutable penaltyReserve;

    mapping(address => Vault[]) private vaultsByOwner;

    event VaultCreated(
        address indexed owner,
        uint256 indexed vaultId,
        string label,
        uint256 goalAmount,
        uint256 deadline
    );
    event Deposited(address indexed owner, uint256 indexed vaultId, uint256 amount, uint256 totalDeposited);
    event PenaltyApplied(address indexed owner, uint256 indexed vaultId, uint256 penaltyAmount, address reserve);
    event Withdrawn(
        address indexed owner,
        uint256 indexed vaultId,
        uint256 userAmount,
        uint256 penaltyAmount,
        bool early
    );

    error InvalidAddress();
    error InvalidAmount();
    error InvalidDeadline();
    error InvalidLabel();
    error VaultNotFound();
    error VaultClosed();

    constructor(address _token, address _penaltyReserve) Ownable(msg.sender) {
        if (_token == address(0) || _penaltyReserve == address(0)) revert InvalidAddress();

        token = _token;
        penaltyReserve = _penaltyReserve;
    }

    function setBasePenaltyBps(uint256 nextBps) external onlyOwner {
        if (nextBps > BPS_DENOMINATOR) revert InvalidAmount();
        BASE_PENALTY_BPS = nextBps;
    }

    function createVault(
        string calldata label,
        uint256 goalAmount,
        uint256 deadline
    ) external returns (uint256 vaultId) {
        if (bytes(label).length == 0) revert InvalidLabel();
        if (goalAmount == 0) revert InvalidAmount();
        if (deadline != 0 && deadline <= block.timestamp) revert InvalidDeadline();

        vaultId = vaultsByOwner[msg.sender].length;
        vaultsByOwner[msg.sender].push(
            Vault({
                label: label,
                goalAmount: goalAmount,
                deadline: deadline,
                createdAt: block.timestamp,
                deposited: 0,
                withdrawn: false
            })
        );

        emit VaultCreated(msg.sender, vaultId, label, goalAmount, deadline);
    }

    function deposit(uint256 vaultId, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();

        Vault storage vault = _vault(msg.sender, vaultId);
        if (vault.withdrawn) revert VaultClosed();

        vault.createdAt = (vault.createdAt * vault.deposited + block.timestamp * amount) / (vault.deposited + amount);
        vault.deposited += amount;
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, vaultId, amount, vault.deposited);
    }

    function withdraw(uint256 vaultId) external nonReentrant {
        Vault storage vault = _vault(msg.sender, vaultId);
        if (vault.withdrawn) revert VaultClosed();
        if (vault.deposited == 0) revert InvalidAmount();

        vault.withdrawn = true;

        bool unlocked = _isUnlocked(vault);
        uint256 penaltyAmount = 0;
        uint256 userAmount = vault.deposited;

        if (!unlocked) {
            penaltyAmount = calculatePenalty(vault.deposited, vault.deadline, vault.createdAt);
            userAmount = vault.deposited - penaltyAmount;
            if (penaltyAmount > 0) {
                IERC20(token).safeTransfer(penaltyReserve, penaltyAmount);
                PenaltyReserve(penaltyReserve).receivePenalty(penaltyAmount);
                emit PenaltyApplied(msg.sender, vaultId, penaltyAmount, penaltyReserve);
            }
        }

        IERC20(token).safeTransfer(msg.sender, userAmount);
        emit Withdrawn(msg.sender, vaultId, userAmount, penaltyAmount, !unlocked);
    }

    function getVault(address owner, uint256 vaultId) external view returns (Vault memory) {
        return _vaultView(owner, vaultId);
    }

    function getVaults(address owner) external view returns (Vault[] memory) {
        return vaultsByOwner[owner];
    }

    function getVaultCount(address owner) external view returns (uint256) {
        return vaultsByOwner[owner].length;
    }

    function isUnlocked(address owner, uint256 vaultId) external view returns (bool) {
        return _isUnlocked(_vaultView(owner, vaultId));
    }

    function getProgressBps(address owner, uint256 vaultId) external view returns (uint256) {
        Vault memory vault = _vaultView(owner, vaultId);
        if (vault.goalAmount == 0) return 0;
        uint256 bps = (vault.deposited * BPS_DENOMINATOR) / vault.goalAmount;
        return bps > BPS_DENOMINATOR ? BPS_DENOMINATOR : bps;
    }

    function calculatePenalty(
        uint256 principal,
        uint256 deadline,
        uint256 createdAt
    ) internal view returns (uint256) {
        if (deadline == 0) {
            return (principal * BASE_PENALTY_BPS) / BPS_DENOMINATOR;
        }
        if (block.timestamp >= deadline) {
            return 0;
        }
        uint256 timeRemaining = deadline - block.timestamp;
        uint256 totalLockPeriod = deadline - createdAt;
        if (totalLockPeriod == 0) return 0;
        uint256 decayFactor = (timeRemaining * 1e18) / totalLockPeriod;
        uint256 effectiveBPS = (BASE_PENALTY_BPS * decayFactor) / 1e18;
        return (principal * effectiveBPS) / BPS_DENOMINATOR;
    }

    function _vault(address owner, uint256 vaultId) internal view returns (Vault storage vault) {
        if (vaultId >= vaultsByOwner[owner].length) revert VaultNotFound();
        vault = vaultsByOwner[owner][vaultId];
    }

    function _vaultView(address owner, uint256 vaultId) internal view returns (Vault memory vault) {
        if (vaultId >= vaultsByOwner[owner].length) revert VaultNotFound();
        vault = vaultsByOwner[owner][vaultId];
    }

    function _isUnlocked(Vault memory vault) internal view returns (bool) {
        return vault.deposited >= vault.goalAmount || (vault.deadline != 0 && block.timestamp >= vault.deadline);
    }
}

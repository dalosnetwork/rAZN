// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";

/**
 * @title RAZNUpgradeable
 * @notice Upgradeable ERC20 implementation intended to be deployed behind a Transparent Proxy (EIP-1967).
 *
 * Token metadata (hard-coded):
 * - Name:   Digital AZN
 * - Symbol: rAZN
 * - Decimals: 6
 *
 * Features:
 * - Pause/Unpause (global stop)
 * - Blacklist (blocks transfers, mint-to, burn-from)
 * - Admin can destroy blacklisted funds (burn entire balance)
 * - USDC-like minter allowance model (MASTER_MINTER sets allowance per MINTER)
 * - burn() and burnFrom()
 * - EIP-2612 Permit
 *
 * IMPORTANT:
 * - Use ONLY behind a proxy. The constructor disables initializers.
 * - Preserve storage layout on upgrades.
 */
contract RAZNUpgradeable is
    Initializable,
    ContextUpgradeable,
    ERC20Upgradeable,
    ERC20PermitUpgradeable,
    PausableUpgradeable,
    AccessControlUpgradeable
{
    // -----------------------------
    // Roles
    // -----------------------------
    bytes32 public constant PAUSER_ROLE        = keccak256("PAUSER_ROLE");
    bytes32 public constant BLACKLISTER_ROLE   = keccak256("BLACKLISTER_ROLE");
    bytes32 public constant MASTER_MINTER_ROLE = keccak256("MASTER_MINTER_ROLE");
    bytes32 public constant MINTER_ROLE        = keccak256("MINTER_ROLE");

    // -----------------------------
    // Custom errors
    // -----------------------------
    error ZeroAddress();
    error NotBlacklisted(address account);
    error SenderBlacklisted(address account);
    error RecipientBlacklisted(address account);
    error MinterAllowanceExceeded(uint256 allowed, uint256 needed);

    // -----------------------------
    // Constants
    // -----------------------------
    uint8 private constant _DECIMALS = 6;

    // -----------------------------
    // State
    // -----------------------------
    /// @notice Blacklisted addresses cannot send/receive/mint/burn.
    mapping(address => bool) public blacklisted;

    /// @notice Remaining mint allowance per minter (USDC-like model).
    mapping(address => uint256) public minterAllowance;

    // -----------------------------
    // Events
    // -----------------------------
    event Blacklisted(address indexed account);
    event UnBlacklisted(address indexed account);

    event MinterConfigured(address indexed minter, uint256 allowance);
    event MinterRemoved(address indexed minter);

    event BlackFundsDestroyed(address indexed account, uint256 burnedAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // Prevent initialization on the implementation contract itself.
        _disableInitializers();
    }

    /**
     * @notice Initialize the token behind a proxy.
     *
     * @param admin_         DEFAULT_ADMIN_ROLE (high privilege; recommend multisig later)
     * @param pauser_        PAUSER_ROLE
     * @param blacklister_   BLACKLISTER_ROLE
     * @param masterMinter_  MASTER_MINTER_ROLE
     * @param initialMinter_ Optional initial minter (can be address(0))
     * @param initialMinterAllowance_ Allowance for initial minter (ignored if initialMinter_ == 0)
     */
    function initialize(
        address admin_,
        address pauser_,
        address blacklister_,
        address masterMinter_,
        address initialMinter_,
        uint256 initialMinterAllowance_
    ) external initializer {
        if (
            admin_ == address(0) ||
            pauser_ == address(0) ||
            blacklister_ == address(0) ||
            masterMinter_ == address(0)
        ) revert ZeroAddress();

        __Context_init();
        __ERC20_init("Digital AZN", "rAZN");
        __ERC20Permit_init("Digital AZN");
        __Pausable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(PAUSER_ROLE, pauser_);
        _grantRole(BLACKLISTER_ROLE, blacklister_);
        _grantRole(MASTER_MINTER_ROLE, masterMinter_);

        if (initialMinter_ != address(0)) {
            _grantRole(MINTER_ROLE, initialMinter_);
            minterAllowance[initialMinter_] = initialMinterAllowance_;
            emit MinterConfigured(initialMinter_, initialMinterAllowance_);
        }
    }

    // -----------------------------
    // Metadata
    // -----------------------------
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /// @notice Useful for ops and upgrade verification.
    function version() external pure returns (string memory) {
        return "1";
    }

    // -----------------------------
    // Pause (start/stop)
    // -----------------------------
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // -----------------------------
    // Blacklist management
    // -----------------------------
    function blacklist(address account) external onlyRole(BLACKLISTER_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        blacklisted[account] = true;
        emit Blacklisted(account);
    }

    function unBlacklist(address account) external onlyRole(BLACKLISTER_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        blacklisted[account] = false;
        emit UnBlacklisted(account);
    }

    /**
     * @notice Burns the entire balance of a blacklisted account.
     * @dev This is also blocked while paused because _update() enforces the global stop.
     */
    function destroyBlackFunds(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!blacklisted[account]) revert NotBlacklisted(account);
        uint256 bal = balanceOf(account);
        _burn(account, bal);
        emit BlackFundsDestroyed(account, bal);
    }

    // -----------------------------
    // Minter allowance model (USDC-like)
    // -----------------------------
    /**
     * @notice Configure a minter and set/update its allowance.
     * @dev MASTER_MINTER can add or update any minter.
     */
    function configureMinter(address minter, uint256 allowance_)
        external
        onlyRole(MASTER_MINTER_ROLE)
    {
        if (minter == address(0)) revert ZeroAddress();
        _grantRole(MINTER_ROLE, minter);
        minterAllowance[minter] = allowance_;
        emit MinterConfigured(minter, allowance_);
    }

    /**
     * @notice Remove minter privileges and zero the allowance.
     */
    function removeMinter(address minter) external onlyRole(MASTER_MINTER_ROLE) {
        minterAllowance[minter] = 0;
        _revokeRole(MINTER_ROLE, minter);
        emit MinterRemoved(minter);
    }

    /**
     * @notice Mint tokens, decreasing the caller's remaining allowance.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        uint256 allowed = minterAllowance[_msgSender()];
        if (allowed < amount) revert MinterAllowanceExceeded(allowed, amount);

        unchecked {
            minterAllowance[_msgSender()] = allowed - amount;
        }

        _mint(to, amount);
    }

    // -----------------------------
    // Burn
    // -----------------------------
    function burn(uint256 amount) external {
        _burn(_msgSender(), amount);
    }

    function burnFrom(address account, uint256 amount) external {
        _spendAllowance(account, _msgSender(), amount);
        _burn(account, amount);
    }

    // -----------------------------
    // Transfer/Mint/Burn enforcement
    // -----------------------------
    /**
     * @dev OZ v5 routes transfer/mint/burn through _update().
     * We enforce:
     * - global pause (blocks all token movements, including mint/burn)
     * - blacklist on from/to (except when address(0) involved)
     */
    function _update(address from, address to, uint256 value) internal override {
        _requireNotPaused();

        if (from != address(0) && blacklisted[from]) revert SenderBlacklisted(from);
        if (to != address(0) && blacklisted[to]) revert RecipientBlacklisted(to);

        super._update(from, to, value);
    }

    // Storage gap for upgrade safety
    uint256[47] private __gap;
}
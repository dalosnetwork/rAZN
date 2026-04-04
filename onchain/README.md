# Digital Manat

Digital Manat is a fiat-referenced, upgradeable stablecoin project built with Solidity and Foundry. The repository currently contains the token logic contract, a custom EIP-1967 transparent proxy, a proxy admin contract, and Python scripts for deployment and day-to-day operations.

This codebase is designed for a centrally managed, compliance-aware stable asset with operational controls such as pausing, blacklisting, controlled minting, and proxy-based upgrades.

Important note: the current on-chain token metadata in the implementation contract is still set to `Digital AZN` with symbol `rAZN`. If the final product should launch as `Digital Manat`, the token name, symbol, and any branding-specific references should be updated in the contract before production deployment.

## Overview

The repository includes:

- `contracts/razn/RAZNUpgradeable.sol`: upgradeable ERC-20 token implementation
- `contracts/proxy/RAZNTransparentProxy.sol`: custom transparent proxy using EIP-1967 storage slots
- `contracts/proxy/RAZNProxyAdmin.sol`: admin contract responsible for upgrades and proxy administration
- `scripts/deploy_razn_bsc_testnet.py`: deployment script for implementation, proxy admin, and proxy initialization
- `scripts/razn_ops.py`: operational script for minting, pausing, blacklisting, upgrades, and role checks
- `foundry.toml`: Foundry configuration

## Token Model

The token implementation is an upgradeable ERC-20 with:

- 6 decimals
- EIP-2612 permit support
- role-based access control via OpenZeppelin `AccessControlUpgradeable`
- global pause / unpause
- blacklist / unblacklist
- destruction of blacklisted funds by admin
- controlled minting with a USDC-style minter allowance model
- direct burn and `burnFrom`

## Roles

The token defines the following roles:

- `DEFAULT_ADMIN_ROLE`: highest privilege for role management and destruction of blacklisted funds
- `PAUSER_ROLE`: can pause and unpause transfers
- `BLACKLISTER_ROLE`: can blacklist and unblacklist accounts
- `MASTER_MINTER_ROLE`: can assign and remove minters and set mint allowances
- `MINTER_ROLE`: can mint within an approved allowance

In production, these roles should not stay on a single EOA. They should be split across a multisig and, where appropriate, dedicated operational wallets or governance-controlled accounts.

## Core Behaviors

### Pause

When paused, all token movement is blocked because transfer, mint, and burn all route through `_update`.

### Blacklist

Blacklisted accounts cannot:

- send tokens
- receive tokens
- receive minted tokens
- burn through normal token flows

The admin can also call `destroyBlackFunds(address)` to burn the full balance of a blacklisted account.

### Minting

Minting follows a controlled allowance model:

- a `MASTER_MINTER_ROLE` account configures a minter
- that minter receives a numeric mint allowance
- each mint reduces the remaining allowance
- the master minter can revoke the minter and zero the allowance

This pattern is appropriate for centrally issued stablecoins where treasury issuance should be explicit and bounded.

### Permit

The token supports EIP-2612 permits, allowing approvals by signed message instead of requiring an on-chain `approve` transaction from the token holder.

## Upgradeability Architecture

The system is built around a transparent proxy pattern:

1. `RAZNUpgradeable` contains the token logic and storage layout.
2. `RAZNTransparentProxy` stores the implementation and admin in standard EIP-1967 slots.
3. `RAZNProxyAdmin` owns and operates the proxy.

The proxy delegates normal user calls to the implementation. The proxy admin is prevented from falling back into token logic, which preserves standard transparent proxy behavior.

### Why a Proxy

Using a proxy allows:

- bug fixes without migrating balances to a new token address
- controlled feature additions
- operational continuity for integrations and wallets
- a stable public token address while logic evolves

## Contract Versioning Strategy

Because this is a proxy-based system, versioning should be applied to the implementation, not to the proxy address.

Recommended versioning model:

- keep the proxy address constant for users and integrations
- deploy a new implementation for each release
- expose an explicit `version()` function in each implementation
- tag releases in Git using semantic versions such as `v1.0.0`, `v1.1.0`, `v2.0.0`
- maintain a changelog describing storage, logic, and admin-operation changes

Suggested contract naming:

- `DigitalManatUpgradeableV1`
- `DigitalManatUpgradeableV2`
- `DigitalManatUpgradeableV3`

The current repository uses `RAZNUpgradeable` and returns `version() = "1"`. For future releases, increment this value in each new implementation and keep the storage layout compatible.

### Upgrade Rules

When releasing a new implementation:

- never reorder existing storage variables
- never remove existing storage variables in a way that breaks layout
- only append new storage variables
- preserve inherited contract ordering
- adjust the storage gap only with care
- keep initializer usage upgrade-safe

If a new version needs post-upgrade setup, add a reinitializer function and execute the upgrade through `upgradeAndCall`.

### Recommended Release Flow

1. Create a new implementation contract version.
2. Review storage layout compatibility.
3. Compile and test locally.
4. Deploy the new implementation.
5. Upgrade the proxy through `RAZNProxyAdmin.upgrade(...)` or `upgradeAndCall(...)`.
6. Verify `version()` and key invariants on the proxy address after upgrade.
7. Record the implementation address and Git tag in release documentation.

## Deployment Flow

The included deployment script performs this sequence:

1. Deploy `RAZNUpgradeable`
2. Deploy `RAZNProxyAdmin`
3. Encode `initialize(...)`
4. Deploy `RAZNTransparentProxy(logic, admin, initData)`
5. Use the proxy address as the token address

The proxy address is the canonical token address that exchanges, wallets, and integrators should use.

## Initialization Parameters

The token initializer accepts:

- `admin_`
- `pauser_`
- `blacklister_`
- `masterMinter_`
- `initialMinter_`
- `initialMinterAllowance_`

The current deployment script assigns all roles to the same EOA for testnet convenience. That is acceptable for local testing and early staging, but not for production.

## Operational Flows

The `scripts/razn_ops.py` helper script supports:

- token info inspection
- balance and allowance checks
- transfer, approve, `transferFrom`
- mint and minter allowance management
- burn and `burnFrom`
- pause and unpause
- blacklist and unblacklist
- destruction of blacklisted funds
- role grant and revoke
- permit execution
- proxy admin inspection
- proxy upgrade
- proxy admin ownership transfer

This script is useful for controlled issuer operations, staging, and runbook-driven admin tasks.

## Local Development

### Prerequisites

- Foundry
- Python 3
- `web3.py`
- `python-dotenv`

### Build

```bash
forge build
```

### Environment

Create a `.env` file with values such as:

```env
RPC_URL=
PRIVATE_KEY=
OWNER_EOA=
CHAIN_ID=97

TOKEN_ADDR=
PROXY_ADMIN_ADDR=
NEW_IMPL_ADDR=
NEW_PROXY_ADMIN_OWNER=
```

### Deploy

```bash
python scripts/deploy_razn_bsc_testnet.py
```

### Run Operations

Edit the last line in `scripts/razn_ops.py` to choose the desired action, then run:

```bash
python scripts/razn_ops.py
```

## Production Recommendations

- transfer `RAZNProxyAdmin` ownership to a multisig
- consider adding a timelock for upgrades
- separate admin, pauser, blacklister, and master minter duties
- maintain a formal upgrade checklist
- add automated tests for pause, blacklist, mint allowance, permit, and upgrade scenarios
- document emergency procedures for pause and blacklist actions
- verify implementation and proxy contracts on the target chain explorer

## Risks and Design Notes

- upgradeable systems add governance and operational risk in exchange for flexibility
- blacklist and forced-burn capabilities are powerful administrative controls and must be governed carefully
- storage layout mistakes can permanently break upgradeability
- proxy admin ownership is a critical security boundary

## Repository Status

This repository already contains the core building blocks for a centrally managed stablecoin. Before a production launch as Digital Manat, the main remaining work should typically include:

- final token branding updates
- test coverage expansion
- audit and storage-layout review
- multisig-based operational hardening
- documented release and upgrade procedures

## License

MIT, unless a different license is later applied at the repository level.

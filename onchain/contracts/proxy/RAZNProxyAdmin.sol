// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ITransparentProxy.sol";

/**
 * @title RAZNProxyAdmin
 * @notice Ownable admin controller for Transparent Proxies.
 *
 * Best practice:
 * - Set owner to a multisig later (and optionally add a timelock).
 * - Keep proxy admin as this contract (not an EOA).
 */
contract RAZNProxyAdmin {
    error NotOwner();
    error ZeroAddress();

    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address owner_) {
        if (owner_ == address(0)) revert ZeroAddress();
        owner = owner_;
        emit OwnershipTransferred(address(0), owner_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function getProxyAdmin(address proxy) external onlyOwner returns (address) {
        return ITransparentProxy(proxy).admin();
    }

    function getProxyImplementation(address proxy) external onlyOwner returns (address) {
        return ITransparentProxy(proxy).implementation();
    }

    function changeProxyAdmin(address proxy, address newAdmin) external onlyOwner {
        ITransparentProxy(proxy).changeAdmin(newAdmin);
    }

    function upgrade(address proxy, address newImplementation) external onlyOwner {
        ITransparentProxy(proxy).upgradeTo(newImplementation);
    }

    function upgradeAndCall(
        address proxy,
        address newImplementation,
        bytes calldata data
    ) external payable onlyOwner {
        ITransparentProxy(proxy).upgradeToAndCall{value: msg.value}(newImplementation, data);
    }
}
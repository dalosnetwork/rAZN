// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @notice Minimal interface for a Transparent Proxy admin surface.
 * ProxyAdmin uses this interface to manage the proxy.
 */
interface ITransparentProxy {
    function admin() external returns (address);
    function implementation() external returns (address);

    function changeAdmin(address newAdmin) external;

    function upgradeTo(address newImplementation) external;
    function upgradeToAndCall(address newImplementation, bytes calldata data) external payable;
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RAZNTransparentProxy
 * @notice Transparent Proxy (EIP-1967) implementation.
 *
 * - Stores implementation and admin in EIP-1967 slots.
 * - Admin can upgrade and change admin.
 * - Admin cannot hit fallback (transparent behavior).
 *
 * Production-oriented minimal code:
 * - Checks that new implementation has code.
 * - Emits standard upgrade/admin events.
 */
contract RAZNTransparentProxy {
    // keccak256("eip1967.proxy.implementation") - 1
    bytes32 private constant _IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    // keccak256("eip1967.proxy.admin") - 1
    bytes32 private constant _ADMIN_SLOT =
        0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

    error ZeroAddress();
    error NotAContract(address implementation);
    error AdminCannotFallback();

    event Upgraded(address indexed implementation);
    event AdminChanged(address previousAdmin, address newAdmin);

    /**
     * @param logic  Initial implementation contract address
     * @param admin_ Proxy admin (typically a ProxyAdmin contract)
     * @param data   Optional initialization calldata (delegatecalled into logic)
     */
    constructor(address logic, address admin_, bytes memory data) payable {
        if (logic == address(0) || admin_ == address(0)) revert ZeroAddress();
        if (logic.code.length == 0) revert NotAContract(logic);

        _setAdmin(admin_);
        _setImplementation(logic);

        // Optional initialization call
        if (data.length > 0) {
            (bool ok, bytes memory ret) = logic.delegatecall(data);
            if (!ok) {
                assembly {
                    revert(add(ret, 0x20), mload(ret))
                }
            }
        }
    }

    modifier ifAdmin() {
        if (msg.sender == _admin()) {
            _;
        } else {
            _fallback();
        }
    }

    function admin() external ifAdmin returns (address) {
        return _admin();
    }

    function implementation() external ifAdmin returns (address) {
        return _implementation();
    }

    function changeAdmin(address newAdmin) external ifAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        address prev = _admin();
        _setAdmin(newAdmin);
        emit AdminChanged(prev, newAdmin);
    }

    function upgradeTo(address newImplementation) external ifAdmin {
        _upgradeTo(newImplementation);
    }

    function upgradeToAndCall(address newImplementation, bytes calldata data)
        external
        payable
        ifAdmin
    {
        _upgradeTo(newImplementation);
        if (data.length > 0) {
            (bool ok, bytes memory ret) = newImplementation.delegatecall(data);
            if (!ok) {
                assembly {
                    revert(add(ret, 0x20), mload(ret))
                }
            }
        }
    }

    fallback() external payable {
        _fallback();
    }

    receive() external payable {
        _fallback();
    }

    function _admin() internal view returns (address a) {
        bytes32 slot = _ADMIN_SLOT;
        assembly {
            a := sload(slot)
        }
    }

    function _implementation() internal view returns (address impl) {
        bytes32 slot = _IMPLEMENTATION_SLOT;
        assembly {
            impl := sload(slot)
        }
    }

    function _setAdmin(address a) internal {
        bytes32 slot = _ADMIN_SLOT;
        assembly {
            sstore(slot, a)
        }
    }

    function _setImplementation(address impl) internal {
        bytes32 slot = _IMPLEMENTATION_SLOT;
        assembly {
            sstore(slot, impl)
        }
    }

    function _upgradeTo(address newImplementation) internal {
        if (newImplementation == address(0)) revert ZeroAddress();
        if (newImplementation.code.length == 0) revert NotAContract(newImplementation);

        _setImplementation(newImplementation);
        emit Upgraded(newImplementation);
    }

    function _fallback() internal {
        // Transparent proxy rule: admin must not fallback into implementation
        if (msg.sender == _admin()) revert AdminCannotFallback();

        address impl = _implementation();
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())

            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}
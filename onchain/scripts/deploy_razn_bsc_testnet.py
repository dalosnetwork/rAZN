import json
import os
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()

RPC_URL = os.getenv("RPC_URL")
PRIVATE_KEY = os.getenv("PRIVATE_KEY")
OWNER_EOA = os.getenv("OWNER_EOA")
CHAIN_ID = int(os.getenv("CHAIN_ID", "97"))

ART_IMPL = os.getenv("ART_IMPL", "out/RAZNUpgradeable.sol/RAZNUpgradeable.json")
ART_ADMIN = os.getenv("ART_ADMIN", "out/RAZNProxyAdmin.sol/RAZNProxyAdmin.json")
ART_PROXY = os.getenv("ART_PROXY", "out/RAZNTransparentProxy.sol/RAZNTransparentProxy.json")


def load_foundry_artifact(path: str):
    with open(path, "r", encoding="utf-8") as f:
        j = json.load(f)

    abi = j.get("abi")
    bytecode = None

    bc = j.get("bytecode")
    if isinstance(bc, dict) and isinstance(bc.get("object"), str):
        bytecode = bc["object"]
    elif isinstance(bc, str):
        bytecode = bc

    if abi is None or bytecode is None:
        raise ValueError(f"Could not parse abi/bytecode from: {path}")

    if not bytecode.startswith("0x"):
        bytecode = "0x" + bytecode

    return abi, bytecode


def build_tx_defaults(w3: Web3, from_addr: str, nonce: int):
    # BSC testnet: legacy gasPrice is simplest.
    return {
        "from": from_addr,
        "nonce": nonce,
        "chainId": CHAIN_ID,
        "gasPrice": w3.eth.gas_price,
    }


def sign_send_wait(w3: Web3, tx: dict, pk: str):
    signed = w3.eth.account.sign_transaction(tx, private_key=pk)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    if receipt.status != 1:
        raise RuntimeError(f"Tx failed: {tx_hash.hex()}")
    return receipt


def deploy_contract(w3: Web3, abi, bytecode: str, ctor_args: tuple, from_addr: str, pk: str, nonce: int):
    c = w3.eth.contract(abi=abi, bytecode=bytecode)
    tx = c.constructor(*ctor_args).build_transaction(build_tx_defaults(w3, from_addr, nonce))

    # Gas estimate with margin
    try:
        est = w3.eth.estimate_gas(tx)
        tx["gas"] = int(est * 1.20)
    except Exception:
        tx["gas"] = 4_500_000

    receipt = sign_send_wait(w3, tx, pk)
    return receipt.contractAddress, receipt


def main():
    if not RPC_URL or not PRIVATE_KEY or not OWNER_EOA:
        raise ValueError("Missing RPC_URL / PRIVATE_KEY / OWNER_EOA (.env)")

    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        raise RuntimeError("RPC not connected")

    owner = w3.to_checksum_address(OWNER_EOA)
    acct = w3.eth.account.from_key(PRIVATE_KEY)
    if acct.address.lower() != owner.lower():
        print(f"[WARN] PRIVATE_KEY address ({acct.address}) != OWNER_EOA ({owner})")

    impl_abi, impl_bytecode = load_foundry_artifact(ART_IMPL)
    admin_abi, admin_bytecode = load_foundry_artifact(ART_ADMIN)
    proxy_abi, proxy_bytecode = load_foundry_artifact(ART_PROXY)

    nonce = w3.eth.get_transaction_count(owner)

    print("1) Deploy implementation: RAZNUpgradeable")
    impl_addr, _ = deploy_contract(w3, impl_abi, impl_bytecode, (), owner, PRIVATE_KEY, nonce)
    nonce += 1
    print("   implementation =", impl_addr)

    print("2) Deploy ProxyAdmin: RAZNProxyAdmin(ownerEOA)")
    proxy_admin_addr, _ = deploy_contract(w3, admin_abi, admin_bytecode, (owner,), owner, PRIVATE_KEY, nonce)
    nonce += 1
    print("   proxyAdmin =", proxy_admin_addr)

    print("3) Encode initData = initialize(...)")
    impl = w3.eth.contract(address=impl_addr, abi=impl_abi)

    # For testnet, set all roles to the same EOA (you can split later)
    admin_ = owner
    pauser_ = owner
    blacklister_ = owner
    master_minter_ = owner
    initial_minter_ = owner

    # Example allowance: 10,000,000 rAZN (6 decimals)
    initial_minter_allowance = 10_000_000 * 10**6

    init_data_hex = impl.functions.initialize(
        admin_,
        pauser_,
        blacklister_,
        master_minter_,
        initial_minter_,
        initial_minter_allowance
    )._encode_transaction_data()

    init_data = bytes.fromhex(init_data_hex[2:])
    print("   initData bytes =", len(init_data))

    print("4) Deploy Transparent Proxy: RAZNTransparentProxy(logic, admin, initData)")
    proxy_addr, _ = deploy_contract(
        w3,
        proxy_abi,
        proxy_bytecode,
        (impl_addr, proxy_admin_addr, init_data),
        owner,
        PRIVATE_KEY,
        nonce
    )
    nonce += 1
    print("   ✅ TOKEN (proxy) address =", proxy_addr)

    # Sanity checks (call via proxy using implementation ABI)
    token = w3.eth.contract(address=proxy_addr, abi=impl_abi)
    print("\nSanity:")
    print(" name    =", token.functions.name().call())
    print(" symbol  =", token.functions.symbol().call())
    print(" decimals=", token.functions.decimals().call())
    print(" version =", token.functions.version().call())
    print(" owner minterAllowance =", token.functions.minterAllowance(owner).call())

    print("\nUse THIS address as token:", proxy_addr)
    print("Upgrade later:")
    print(" - deploy new impl")
    print(" - call ProxyAdmin.upgrade(proxy_addr, new_impl_addr)")
    print(" - (optional) ProxyAdmin.transferOwnership(multisig) later")


if __name__ == "__main__":
    main()
import os
import json
import time
from decimal import Decimal, InvalidOperation

from dotenv import load_dotenv
from web3 import Web3

# BSC-style PoA extraData issues: harmless if not needed
try:
    from web3.middleware import geth_poa_middleware
except Exception:
    geth_poa_middleware = None

load_dotenv()


# ----------------------------
# Config (reads from .env)
# ----------------------------
RPC_URL = os.getenv("RPC_URL")
CHAIN_ID = int(os.getenv("CHAIN_ID", "97"))

PRIVATE_KEY = os.getenv("PRIVATE_KEY")
FROM_EOA = os.getenv("OWNER_EOA")  # deploy script uses OWNER_EOA, keep same

TOKEN_ADDR = os.getenv("TOKEN_ADDR")  # proxy address (THE token)
PROXY_ADMIN_ADDR = os.getenv("PROXY_ADMIN_ADDR")  # RAZNProxyAdmin address

ART_TOKEN = os.getenv("ART_TOKEN", "out/RAZNUpgradeable.sol/RAZNUpgradeable.json")
ART_PROXY_ADMIN = os.getenv("ART_PROXY_ADMIN", "out/RAZNProxyAdmin.sol/RAZNProxyAdmin.json")

GAS_PRICE_GWEI = os.getenv("GAS_PRICE_GWEI")  # optional fallback

# Defaults for quick ops (you can change these quickly)
DEFAULT_TO = os.getenv("DEFAULT_TO", FROM_EOA or "")
DEFAULT_SPENDER = os.getenv("DEFAULT_SPENDER", FROM_EOA or "")
DEFAULT_ACCOUNT = os.getenv("DEFAULT_ACCOUNT", FROM_EOA or "")

# Amount defaults (human units)
DEFAULT_AMOUNT = os.getenv("DEFAULT_AMOUNT", "1")  # "1" rAZN
DEFAULT_ALLOWANCE = os.getenv("DEFAULT_ALLOWANCE", "1000")  # "1000" rAZN

# Upgrade defaults (set when needed)
NEW_IMPL_ADDR = os.getenv("NEW_IMPL_ADDR", "")
NEW_PROXY_ADMIN_OWNER = os.getenv("NEW_PROXY_ADMIN_OWNER", "")


# ----------------------------
# Helpers
# ----------------------------
def die(msg: str):
    raise SystemExit(msg)


def load_foundry_abi_bytecode(path: str):
    with open(path, "r", encoding="utf-8") as f:
        j = json.load(f)
    abi = j.get("abi")
    bytecode = None
    bc = j.get("bytecode")
    if isinstance(bc, dict) and isinstance(bc.get("object"), str):
        bytecode = bc["object"]
    elif isinstance(bc, str):
        bytecode = bc
    return abi, bytecode


def load_foundry_abi(path: str):
    abi, _ = load_foundry_abi_bytecode(path)
    if abi is None:
        die(f"ABI not found in artifact: {path}")
    return abi


def w3_setup() -> Web3:
    if not RPC_URL:
        die("RPC_URL missing in .env")
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        die("RPC not connected. Check RPC_URL")

    if geth_poa_middleware is not None:
        # BSC often needs this depending on provider
        w3.middleware_onion.inject(geth_poa_middleware, layer=0)

    return w3


def checksum(w3: Web3, addr: str) -> str:
    if not addr:
        die("Address is empty")
    return w3.to_checksum_address(addr)


def gas_price(w3: Web3) -> int:
    gp = None
    try:
        gp = w3.eth.gas_price
    except Exception:
        gp = None

    if gp is not None and gp > 0:
        return int(gp)

    # fallback
    if GAS_PRICE_GWEI:
        return int(Decimal(GAS_PRICE_GWEI) * (10 ** 9))

    # safe default
    return int(3 * 10 ** 9)


def build_base_tx(w3: Web3, from_addr: str) -> dict:
    return {
        "from": from_addr,
        "nonce": w3.eth.get_transaction_count(from_addr),
        "chainId": CHAIN_ID,
        "gasPrice": gas_price(w3),
    }


def sign_send_wait(w3: Web3, tx: dict):
    if not PRIVATE_KEY:
        die("PRIVATE_KEY missing in .env")
    signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    if receipt.status != 1:
        die(f"Tx failed: {tx_hash.hex()}")
    return tx_hash.hex(), receipt


def send_contract_tx(w3: Web3, fn, from_addr: str, value_wei: int = 0):
    tx = fn.build_transaction({**build_base_tx(w3, from_addr), "value": value_wei})

    # estimate + margin
    try:
        est = w3.eth.estimate_gas(tx)
        tx["gas"] = int(est * 1.20)
    except Exception:
        tx["gas"] = 5_000_000

    h, r = sign_send_wait(w3, tx)
    print("tx:", h, "status:", r.status, "gasUsed:", r.gasUsed)
    return h, r


def parse_amount_units(amount_str: str, decimals: int) -> int:
    """
    Parses human amount to base units.
    Examples:
      "1" -> 1 * 10^decimals
      "0.5" -> 0.5 * 10^decimals
    """
    try:
        d = Decimal(amount_str)
    except InvalidOperation:
        die(f"Invalid amount: {amount_str}")

    if d < 0:
        die("Amount cannot be negative")

    scaled = d * (Decimal(10) ** decimals)
    # floor exactly
    return int(scaled.to_integral_value(rounding="ROUND_DOWN"))


def pretty_units(amount: int, decimals: int) -> str:
    return str(Decimal(amount) / (Decimal(10) ** decimals))


def get_token(w3: Web3):
    if not TOKEN_ADDR:
        die("TOKEN_ADDR missing in .env (proxy token address)")
    abi = load_foundry_abi(ART_TOKEN)
    token = w3.eth.contract(address=checksum(w3, TOKEN_ADDR), abi=abi)
    return token


def get_proxy_admin(w3: Web3):
    if not PROXY_ADMIN_ADDR:
        die("PROXY_ADMIN_ADDR missing in .env")
    abi = load_foundry_abi(ART_PROXY_ADMIN)
    adm = w3.eth.contract(address=checksum(w3, PROXY_ADMIN_ADDR), abi=abi)
    return adm


def get_from(w3: Web3) -> str:
    if not FROM_EOA:
        die("OWNER_EOA missing in .env")
    return checksum(w3, FROM_EOA)


def role_hash(name: str) -> bytes:
    return Web3.keccak(text=name)


# ----------------------------
# Actions (reads)
# ----------------------------
def action_info():
    w3 = w3_setup()
    token = get_token(w3)

    name = token.functions.name().call()
    symbol = token.functions.symbol().call()
    decimals = token.functions.decimals().call()
    total = token.functions.totalSupply().call()
    paused = token.functions.paused().call()
    version = token.functions.version().call()

    print("TOKEN:", token.address)
    print("name     =", name)
    print("symbol   =", symbol)
    print("decimals =", decimals)
    print("totalSupply =", total, f"({pretty_units(total, decimals)} {symbol})")
    print("paused   =", paused)
    print("version  =", version)

    # role constants
    print("\nROLE HASHES:")
    print("DEFAULT_ADMIN_ROLE =", "0x" + (b"\x00" * 32).hex())
    for r in ["PAUSER_ROLE", "BLACKLISTER_ROLE", "MASTER_MINTER_ROLE", "MINTER_ROLE"]:
        print(r, "=", role_hash(r).hex())


def action_balance():
    w3 = w3_setup()
    token = get_token(w3)
    decimals = token.functions.decimals().call()

    acct = checksum(w3, DEFAULT_ACCOUNT)
    bal = token.functions.balanceOf(acct).call()
    print("account =", acct)
    print("balance =", bal, f"({pretty_units(bal, decimals)} rAZN)")


def action_allowance_read():
    w3 = w3_setup()
    token = get_token(w3)
    decimals = token.functions.decimals().call()

    owner = checksum(w3, DEFAULT_ACCOUNT)
    spender = checksum(w3, DEFAULT_SPENDER)
    a = token.functions.allowance(owner, spender).call()
    print("owner   =", owner)
    print("spender =", spender)
    print("allowance =", a, f"({pretty_units(a, decimals)} rAZN)")


def action_minter_allowance_read():
    w3 = w3_setup()
    token = get_token(w3)
    decimals = token.functions.decimals().call()

    minter = checksum(w3, DEFAULT_ACCOUNT)
    a = token.functions.minterAllowance(minter).call()
    print("minter =", minter)
    print("minterAllowance =", a, f"({pretty_units(a, decimals)} rAZN)")


def action_blacklisted_read():
    w3 = w3_setup()
    token = get_token(w3)
    acct = checksum(w3, DEFAULT_ACCOUNT)
    b = token.functions.blacklisted(acct).call()
    print("account =", acct)
    print("blacklisted =", b)


def action_has_role():
    w3 = w3_setup()
    token = get_token(w3)

    acct = checksum(w3, DEFAULT_ACCOUNT)
    role_name = os.getenv("ROLE_NAME", "DEFAULT_ADMIN_ROLE")

    if role_name == "DEFAULT_ADMIN_ROLE":
        role = b"\x00" * 32
    else:
        role = role_hash(role_name)

    ok = token.functions.hasRole(role, acct).call()
    print("role_name =", role_name)
    print("role_hash =", role.hex())
    print("account   =", acct)
    print("hasRole   =", ok)


# ----------------------------
# Actions (ERC20)
# ----------------------------
def action_transfer():
    w3 = w3_setup()
    token = get_token(w3)
    from_addr = get_from(w3)
    decimals = token.functions.decimals().call()

    to = checksum(w3, DEFAULT_TO)
    amount = parse_amount_units(DEFAULT_AMOUNT, decimals)

    print("transfer:", from_addr, "->", to, "amount:", amount, f"({DEFAULT_AMOUNT} rAZN)")
    send_contract_tx(w3, token.functions.transfer(to, amount), from_addr)


def action_approve():
    w3 = w3_setup()
    token = get_token(w3)
    from_addr = get_from(w3)
    decimals = token.functions.decimals().call()

    spender = checksum(w3, DEFAULT_SPENDER)
    amount = parse_amount_units(DEFAULT_ALLOWANCE, decimals)

    print("approve:", "spender:", spender, "amount:", amount, f"({DEFAULT_ALLOWANCE} rAZN)")
    send_contract_tx(w3, token.functions.approve(spender, amount), from_addr)


def action_transfer_from():
    """
    transferFrom(DEFAULT_ACCOUNT -> DEFAULT_TO) using msg.sender = FROM_EOA
    Requires allowance(DEFAULT_ACCOUNT, FROM_EOA) >= amount.
    """
    w3 = w3_setup()
    token = get_token(w3)
    caller = get_from(w3)
    decimals = token.functions.decimals().call()

    owner = checksum(w3, DEFAULT_ACCOUNT)
    to = checksum(w3, DEFAULT_TO)
    amount = parse_amount_units(DEFAULT_AMOUNT, decimals)

    print("transferFrom:", owner, "->", to, "by:", caller, "amount:", amount, f"({DEFAULT_AMOUNT} rAZN)")
    send_contract_tx(w3, token.functions.transferFrom(owner, to, amount), caller)


def action_burn():
    w3 = w3_setup()
    token = get_token(w3)
    from_addr = get_from(w3)
    decimals = token.functions.decimals().call()

    amount = parse_amount_units(DEFAULT_AMOUNT, decimals)
    print("burn:", from_addr, "amount:", amount, f"({DEFAULT_AMOUNT} rAZN)")
    send_contract_tx(w3, token.functions.burn(amount), from_addr)


def action_burn_from():
    """
    burnFrom(DEFAULT_ACCOUNT) using msg.sender = FROM_EOA
    Requires allowance(DEFAULT_ACCOUNT, FROM_EOA) >= amount.
    """
    w3 = w3_setup()
    token = get_token(w3)
    caller = get_from(w3)
    decimals = token.functions.decimals().call()

    acct = checksum(w3, DEFAULT_ACCOUNT)
    amount = parse_amount_units(DEFAULT_AMOUNT, decimals)

    print("burnFrom:", acct, "by:", caller, "amount:", amount, f"({DEFAULT_AMOUNT} rAZN)")
    send_contract_tx(w3, token.functions.burnFrom(acct, amount), caller)


# ----------------------------
# Actions (Mint / Minter)
# ----------------------------
def action_mint():
    w3 = w3_setup()
    token = get_token(w3)
    from_addr = get_from(w3)
    decimals = token.functions.decimals().call()

    to = checksum(w3, DEFAULT_TO)
    amount = parse_amount_units(DEFAULT_AMOUNT, decimals)

    print("mint:", "to:", to, "amount:", amount, f"({DEFAULT_AMOUNT} rAZN)")
    send_contract_tx(w3, token.functions.mint(to, amount), from_addr)


def action_configure_minter():
    w3 = w3_setup()
    token = get_token(w3)
    from_addr = get_from(w3)
    decimals = token.functions.decimals().call()

    minter = checksum(w3, DEFAULT_ACCOUNT)
    allowance = parse_amount_units(DEFAULT_ALLOWANCE, decimals)

    print("configureMinter:", "minter:", minter, "allowance:", allowance, f"({DEFAULT_ALLOWANCE} rAZN)")
    send_contract_tx(w3, token.functions.configureMinter(minter, allowance), from_addr)


def action_remove_minter():
    w3 = w3_setup()
    token = get_token(w3)
    from_addr = get_from(w3)

    minter = checksum(w3, DEFAULT_ACCOUNT)
    print("removeMinter:", minter)
    send_contract_tx(w3, token.functions.removeMinter(minter), from_addr)


# ----------------------------
# Actions (Pause)
# ----------------------------
def action_pause():
    w3 = w3_setup()
    token = get_token(w3)
    from_addr = get_from(w3)
    print("pause()")
    send_contract_tx(w3, token.functions.pause(), from_addr)


def action_unpause():
    w3 = w3_setup()
    token = get_token(w3)
    from_addr = get_from(w3)
    print("unpause()")
    send_contract_tx(w3, token.functions.unpause(), from_addr)


# ----------------------------
# Actions (Blacklist)
# ----------------------------
def action_blacklist():
    w3 = w3_setup()
    token = get_token(w3)
    from_addr = get_from(w3)

    acct = checksum(w3, DEFAULT_ACCOUNT)
    print("blacklist:", acct)
    send_contract_tx(w3, token.functions.blacklist(acct), from_addr)


def action_unblacklist():
    w3 = w3_setup()
    token = get_token(w3)
    from_addr = get_from(w3)

    acct = checksum(w3, DEFAULT_ACCOUNT)
    print("unBlacklist:", acct)
    send_contract_tx(w3, token.functions.unBlacklist(acct), from_addr)


def action_destroy_black_funds():
    w3 = w3_setup()
    token = get_token(w3)
    from_addr = get_from(w3)

    acct = checksum(w3, DEFAULT_ACCOUNT)
    print("destroyBlackFunds:", acct)
    send_contract_tx(w3, token.functions.destroyBlackFunds(acct), from_addr)


# ----------------------------
# Actions (Roles)
# ----------------------------
def action_grant_role():
    w3 = w3_setup()
    token = get_token(w3)
    from_addr = get_from(w3)

    role_name = os.getenv("ROLE_NAME", "PAUSER_ROLE")
    acct = checksum(w3, DEFAULT_ACCOUNT)

    if role_name == "DEFAULT_ADMIN_ROLE":
        role = b"\x00" * 32
    else:
        role = role_hash(role_name)

    print("grantRole:", role_name, role.hex(), "to", acct)
    send_contract_tx(w3, token.functions.grantRole(role, acct), from_addr)


def action_revoke_role():
    w3 = w3_setup()
    token = get_token(w3)
    from_addr = get_from(w3)

    role_name = os.getenv("ROLE_NAME", "PAUSER_ROLE")
    acct = checksum(w3, DEFAULT_ACCOUNT)

    if role_name == "DEFAULT_ADMIN_ROLE":
        role = b"\x00" * 32
    else:
        role = role_hash(role_name)

    print("revokeRole:", role_name, role.hex(), "from", acct)
    send_contract_tx(w3, token.functions.revokeRole(role, acct), from_addr)


# ----------------------------
# Actions (Permit - EIP-2612)
# ----------------------------
def action_permit():
    """
    Signs and submits permit(owner, spender, value, deadline, v, r, s).

    Defaults:
      owner   = FROM_EOA
      spender = DEFAULT_SPENDER
      value   = DEFAULT_ALLOWANCE (human rAZN)
      deadline = now + 3600 seconds

    NOTE:
      This requires the token to have ERC20PermitUpgradeable enabled (it does).
      Domain:
        name = "Digital AZN"
        version = "1"  (OZ default)
        chainId = CHAIN_ID
        verifyingContract = TOKEN_ADDR (proxy)
    """
    from eth_account import Account
    from eth_account.messages import encode_typed_data

    w3 = w3_setup()
    token = get_token(w3)

    owner = get_from(w3)
    spender = checksum(w3, DEFAULT_SPENDER)
    decimals = token.functions.decimals().call()
    value = parse_amount_units(DEFAULT_ALLOWANCE, decimals)

    deadline = int(time.time()) + int(os.getenv("PERMIT_TTL", "3600"))
    nonce = token.functions.nonces(owner).call()

    typed = {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "Permit": [
                {"name": "owner", "type": "address"},
                {"name": "spender", "type": "address"},
                {"name": "value", "type": "uint256"},
                {"name": "nonce", "type": "uint256"},
                {"name": "deadline", "type": "uint256"},
            ],
        },
        "primaryType": "Permit",
        "domain": {
            "name": "Digital AZN",
            "version": "1",
            "chainId": CHAIN_ID,
            "verifyingContract": token.address,
        },
        "message": {
            "owner": owner,
            "spender": spender,
            "value": value,
            "nonce": nonce,
            "deadline": deadline,
        },
    }

    signable = encode_typed_data(full_message=typed)
    sig = Account.sign_message(signable, private_key=PRIVATE_KEY)

    v = sig.v
    r = sig.r.to_bytes(32, "big")
    s = sig.s.to_bytes(32, "big")

    print("permit:")
    print(" owner   =", owner)
    print(" spender =", spender)
    print(" value   =", value, f"({DEFAULT_ALLOWANCE} rAZN)")
    print(" nonce   =", nonce)
    print(" deadline=", deadline)

    # tx sender can be anyone; send from owner for simplicity
    send_contract_tx(
        w3,
        token.functions.permit(owner, spender, value, deadline, v, r, s),
        owner
    )

    # verify allowance
    a = token.functions.allowance(owner, spender).call()
    print("new allowance =", a, f"({pretty_units(a, decimals)} rAZN)")


# ----------------------------
# Actions (ProxyAdmin upgrades)
# ----------------------------
def action_proxyadmin_info():
    w3 = w3_setup()
    adm = get_proxy_admin(w3)
    from_addr = get_from(w3)

    # Note: these are state-changing calls (not view) in our ProxyAdmin implementation,
    # but they only call proxy's admin() / implementation() through the contract.
    proxy = checksum(w3, TOKEN_ADDR)

    print("ProxyAdmin:", adm.address)
    print("Proxy (token):", proxy)
    print("Owner (EOA):", from_addr)

    # These calls are "external onlyOwner returns (...)" but they are not view; still callable as eth_call.
    # web3.py uses eth_call for .call()
    cur_admin = adm.functions.getProxyAdmin(proxy).call({"from": from_addr})
    cur_impl = adm.functions.getProxyImplementation(proxy).call({"from": from_addr})

    print("proxy.admin() =", cur_admin)
    print("proxy.implementation() =", cur_impl)


def action_upgrade():
    """
    Deploy new implementation separately, then set NEW_IMPL_ADDR in .env and run this action.
    """
    if not NEW_IMPL_ADDR:
        die("Set NEW_IMPL_ADDR in .env first")

    w3 = w3_setup()
    adm = get_proxy_admin(w3)
    from_addr = get_from(w3)

    proxy = checksum(w3, TOKEN_ADDR)
    new_impl = checksum(w3, NEW_IMPL_ADDR)

    print("UPGRADE:")
    print(" proxy =", proxy)
    print(" newImplementation =", new_impl)

    send_contract_tx(w3, adm.functions.upgrade(proxy, new_impl), from_addr)

    # sanity: read token.version() afterwards
    token = get_token(w3)
    print("token.version() =", token.functions.version().call())


def action_proxyadmin_transfer_ownership():
    if not NEW_PROXY_ADMIN_OWNER:
        die("Set NEW_PROXY_ADMIN_OWNER in .env first")

    w3 = w3_setup()
    adm = get_proxy_admin(w3)
    from_addr = get_from(w3)

    new_owner = checksum(w3, NEW_PROXY_ADMIN_OWNER)
    print("ProxyAdmin.transferOwnership ->", new_owner)
    send_contract_tx(w3, adm.functions.transferOwnership(new_owner), from_addr)


# ----------------------------
# Dispatcher
# ----------------------------
ACTIONS = {
    # reads
    "info": action_info,
    "balance": action_balance,
    "allowance": action_allowance_read,
    "minter_allowance": action_minter_allowance_read,
    "blacklisted": action_blacklisted_read,
    "has_role": action_has_role,

    # erc20
    "transfer": action_transfer,
    "approve": action_approve,
    "transferFrom": action_transfer_from,
    "burn": action_burn,
    "burnFrom": action_burn_from,

    # mint/minter
    "mint": action_mint,
    "configureMinter": action_configure_minter,
    "removeMinter": action_remove_minter,

    # pause
    "pause": action_pause,
    "unpause": action_unpause,

    # blacklist
    "blacklist": action_blacklist,
    "unblacklist": action_unblacklist,
    "destroyBlackFunds": action_destroy_black_funds,

    # roles
    "grantRole": action_grant_role,
    "revokeRole": action_revoke_role,

    # permit
    "permit": action_permit,

    # proxyadmin
    "proxyadmin_info": action_proxyadmin_info,
    "upgrade": action_upgrade,
    "proxyadmin_transferOwnership": action_proxyadmin_transfer_ownership,
}


def run(action: str):
    if action not in ACTIONS:
        print("Unknown action:", action)
        print("Available actions:")
        for k in ACTIONS.keys():
            print(" -", k)
        die("Choose a valid action.")
    ACTIONS[action]()


def main():
    """
    👉 Only change the next line to do whatever you want.
    Examples:
      run("info")
      run("mint")
      run("transfer")
      run("approve")
      run("pause")
      run("blacklist")
      run("permit")
      run("upgrade")
    """
    run("mint")  # <--- CHANGE ONLY THIS LINE


if __name__ == "__main__":
    main()
## This repo reproduce evmosjs metamask signing error

### The problem:

Broadcasting delegate transaction created with latest version of evmosjs and signed with metamask don't work.
Broadcast request return following response:

```json
{
  "tx_response": {
    "height": "0",
    "txhash": "6403EA9C372314AA005B2D919B9FCACCD213DEE9B87BEDD6F3A83A22C1979249",
    "codespace": "sdk",
    "code": 4,
    "data": "",
    "raw_log": "signature verification failed; please verify account number (1382) and chain-id (haqq_54211-3): unauthorized",
    "logs": [],
    "info": "",
    "gas_wanted": "0",
    "gas_used": "0",
    "tx": null,
    "timestamp": "",
    "events": []
  }
}
```

Supported chain: HAQQ Mainnet, HAQQ Testedge, localnet

You can get some testnet coins with faucet: https://testedge2.haqq.network/

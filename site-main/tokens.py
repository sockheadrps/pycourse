import requests
import json
from bit import PrivateKeyTestnet

# Replace with your own data
from_address = "mzJ7Kh6vXjS8QgE8xvcn78WbgcKQmtTJ8k"
to_address = "tb1qnl2jg7cr3zwcgv5mgd6znaggf5pvlgtxv2342a"
private_key = "cMvBWGa3sxMA3hhpria5Rd9th2hTNoiVn5hP6mhPtQWyimyq1DiL"  # Keep this safe!



# 1️⃣ Build transaction skeleton
url = "https://api.blockcypher.com/v1/btc/test3/txs/new"
payload = {
    "inputs": [{"addresses": [from_address]}],
    "outputs": [{"addresses": [to_address], "value": 10000}]
}

response = requests.post(url, json=payload)
tx_skeleton = response.json()
print("TX skeleton:", tx_skeleton)

# 2️⃣ Sign the transaction
key = PrivateKeyTestnet(private_key)
signed_tx = key.sign_transaction(tx_skeleton['tosign'][0])
tx_skeleton['signatures'] = [signed_tx]
tx_skeleton['pubkeys'] = [key.public_key.hex()]

# 3️⃣ Send the signed transaction
send_url = "https://api.blockcypher.com/v1/btc/test3/txs/send"
response = requests.post(send_url, json=tx_skeleton)
print("Final TX:", response.json())
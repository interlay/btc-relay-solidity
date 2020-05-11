# Create testdata

## Python requirements

Create a virtual environment with `virtualenv venv` and activate it with `source venv/bin/activate`.

Install the required python packages in the root of this project from the `requirements.txt` file with `pip install -r requirements.txt`.

## Install Bitcoin Core client

Follow the instructions [on from the Bitcoin website](https://bitcoin.org/en/full-node#linux-instructions).

## Setup the regtest environment

Configure an rpc password with `vim ~/.bitcoin/bitcoin.conf` and add your password like `rpcpassword=change_this_to_a_long_random_password`.
Then change access rights to the conf file via `chmod 0600 bitcoin.conf`.

Start the regtest server with `bitcoind -regtest -daemon -txindex`.

## Generate testdata

Execute `python test/testdata/testdata.py`.

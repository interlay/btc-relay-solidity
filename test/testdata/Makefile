BITCOIND=bitcoind
BITCOINCLI=bitcoin-cli
B1_FLAGS=
B1=-datadir=1 $(B1_FLAGS)
BLOCKS=1
ADDRESS=
AMOUNT=
ACCOUNT=

start:
	$(BITCOIND) $(B1) -daemon -rest -txindex

start-gui:
	$(BITCOINGUI) $(B1) &

generate:
	$(BITCOINCLI) $(B1) generate $(BLOCKS)

getinfo:
	$(BITCOINCLI) $(B1) getinfo

sendfrom1:
	$(BITCOINCLI) $(B1) sendtoaddress $(ADDRESS) $(AMOUNT)

address1:
	$(BITCOINCLI) $(B1) getnewaddress $(ACCOUNT)
stop:
	$(BITCOINCLI) $(B1) stop

clean:
	find 1/regtest/* -not -name 'server.*' -delete

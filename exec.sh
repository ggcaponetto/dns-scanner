#!/usr/bin/env bash
echo "printing the $3 and $5 environment variables"
echo $0
echo $1
echo $2
echo $3
echo $4
echo $5
echo $6
node src/index.js --loglevel=debug --mode=sequence --${3} --${5}

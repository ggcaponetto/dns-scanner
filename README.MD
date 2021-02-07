# dns-scanner

A simple linux utility to scan ipv4 ranges for PTR records and store them in mongodb.
Requires [dig](https://en.wikipedia.org/wiki/Dig_(command)).

### Usage
1. ``node src/index.js --loglevel=debug --mode=sequence --from 45.10.16.0 --to=45.10.22.0``

###Test
1. ``npm run test``

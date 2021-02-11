/* eslint-env node, mocha */
import { IpUtil as IpUtilLib } from '../src/iputil';
import { DbUtil as DbUtilLib } from '../src/db';

const assert = require('assert');

describe('IpUtil', () => {
  describe('binary manipulation of ip addresses', () => {
    it('should convert decimal 127 to binary 01111111', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.decimalToOctet(127);
      assert.equal(res, '01111111');
    });
    it('should return 1 when adding 0 and 1 in binary', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.addBinary('0', '1');
      assert.equal(res, '1');
    });
    it('should return 101 when adding 100 and 1 in binary', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.addBinary('100', '1');
      assert.equal(res, '101');
    });
    it('should return 100 when adding 11 and 1 in binary', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.addBinary('11', '1');
      assert.equal(res, '100');
    });
    it('should convert a decimal 0 to 0.0.0.0', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.decimalToIp(0);
      assert.equal(res, '0.0.0.0');
    });
    it('should convert a decimal 127 to 0.0.0.127', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.decimalToIp(127);
      assert.equal(res, '0.0.0.127');
    });
    it('should convert a decimal 256 to 0.0.1.0', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.decimalToIp(256);
      assert.equal(res, '0.0.1.0');
    });
    it('should convert a decimal 4294967295 to 255.255.255.255', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.decimalToIp(4294967295);
      assert.equal(res, '255.255.255.255');
    });
    it('should return 0.0.0.1 when incrementing 0.0.0.0', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.incrementIp('0.0.0.0');
      assert.equal(res, '0.0.0.1');
    });
    it('should return 0.0.0.128 when incrementing 0.0.0.127', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.incrementIp('0.0.0.127');
      assert.equal(res, '0.0.0.128');
    });
    it('should return 0.0.1.0 when incrementing 0.0.0.255', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.incrementIp('0.0.0.255');
      assert.equal(res, '0.0.1.0');
    });
    it('should return 2.255.255.255 when incrementing 1.255.255.255', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.incrementIp('1.255.255.255');
      assert.equal(res, '2.0.0.0');
    });
    it('should return 0 as distance from 1.255.255.255 to 1.255.255.255', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.getDistance('1.255.255.255', '1.255.255.255');
      assert.equal(res, 0);
    });
    it('should return 100 as distance from 1.255.255.255 to 1.255.255.255', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.getDistance('1.255.255.255', '2.0.0.99');
      assert.equal(res, 100);
    });
  });
});

describe('Db', () => {
  describe('connection and disconnection', () => {
    it('should be able to open and close the connection', (done) => {
      const DbUtil = new DbUtilLib(4);
      const { mongoose } = DbUtil.connect(() => {
        // close the connection once it has been opened
        mongoose.connection.close();
      }, () => {
        done();
      });
    }).timeout(10000);
    it('should be able to insert a record into the db', (done) => {
      const DbUtil = new DbUtilLib(4);
      const { mongoose } = DbUtil.connect(async () => {
        await DbUtil.deleteAll({
          ip: '127.0.0.1',
        });
        await DbUtil.insert({
          ip: '127.0.0.1', host: 'localhost',
        }, (err, savedRecord) => {
          // close the connection once it has been opened
          mongoose.connection.close();
        });
      }, () => {
        done();
      });
    }).timeout(10000);
    it('should be able to find an ip range to scan', (done) => {
      const DbUtil = new DbUtilLib(4);
      const { mongoose } = DbUtil.connect(async () => {
        // close the connection once it has been opened
        await DbUtil.findRangeToScan();
        await mongoose.connection.close();
      }, () => {
        done();
      });
    }).timeout(Number.POSITIVE_INFINITY);
  });
});

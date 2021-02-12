/* eslint-env node, mocha */

import { IpUtil as IpUtilLib } from '../src/iputil';
import { DbUtil as DbUtilLib } from '../src/db';

require('dotenv').config();
const chalk = require('chalk');

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

const dbConnectionTimeout = 10 * 1000;
/* eslint-disable prefer-arrow-callback */
describe('Db', function dbTest() {
  describe('connection and disconnection', function connectionTest() {
    beforeEach(async (done) => {
      this.timeout(dbConnectionTimeout);
      console.log(chalk.white('cleaning the test db'));
      const collectionName = 'records';
      done();
      const DbUtil = new DbUtilLib(4);
      const connection = await DbUtil.connect(
        {
          host: process.env.DB_HOST_TEST,
        },
      );
      connection.dropCollection('records');
      connection.createCollection('records');
      console.log(chalk.white(`recreated the ${collectionName} on the test database.`));
    });
    it('should be able to open and close the connection', async function test() {
      const DbUtil = new DbUtilLib(4);
      return DbUtil.connect();
    }).timeout(dbConnectionTimeout);
    it('should be able to insert a record into the db', async function test() {
      const DbUtil = new DbUtilLib(4);
      const connection = await DbUtil.connect();
      await DbUtil.deleteAll({
        ip: '127.0.0.1',
      });
      return DbUtil.insert({
        ip: '127.0.0.1', host: 'localhost',
        // eslint-disable-next-line no-unused-vars
      }, (err, savedRecord) => {
        // close the connection once it has been opened
        connection.close();
      });
    }).timeout(dbConnectionTimeout);
    it('should be able to find the latest record in the range 0.0.0.0 - 255.255.255.255', async function test() {
      const DbUtil = new DbUtilLib(4);
      const connection = await DbUtil.connect();
      // close the connection once it has been opened
      const latestRecordsForAllRanges = await DbUtil.getLatestRecordForAllRanges();
      // console.debug('latest records info: ', JSON.stringify(latestRecordsForAllRanges));
      const rangesWithOldestRecords = DbUtil.getRangesWithOldestRecord(latestRecordsForAllRanges);
      console.log('latest records info: \n', JSON.stringify({
        latestRecordsForAllRanges,
        rangesWithOldestRecords,
      }, null, 4));
      return connection.close();
    }).timeout(Number.POSITIVE_INFINITY);
    it('should be able to automatically select the most outdated range to scan', async function test() {
      const DbUtil = new DbUtilLib(4);
      const connection = await DbUtil.connect();
      // close the connection once it has been opened
      const rangeToScan = await DbUtil.getRangeToScan();
      console.log('range to scan: \n', JSON.stringify({
        rangeToScan,
      }, null, 4));
      return connection.close();
    }).timeout(Number.POSITIVE_INFINITY);
  });
});
/* eslint-enable prefer-arrow-callback */

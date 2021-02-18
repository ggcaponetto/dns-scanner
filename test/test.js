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
    it('should return 2.0.0.0 when incrementing 1.255.255.255', () => {
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
    it('should return 0 as decimal representation of the ip 0.0.0.0', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.ipToDecimal('0.0.0.0');
      assert.equal(res, 0);
    });
    it('should return 2263419925 as decimal representation of the ip 134.233.12.21', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.ipToDecimal('134.233.12.21');
      assert.equal(res, 2263419925);
    });
    it('should return 4294967295 as decimal representation of the ip 255.255.255.255', () => {
      const IpUtil = new IpUtilLib(4);
      const res = IpUtil.ipToDecimal('255.255.255.255');
      assert.equal(res, 4294967295);
    });
  });
});

const dbConnectionTimeout = 10 * 1000;
const longRunningDbOpsTimeout = 5 * 60 * 1000;
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
      await DbUtil.insert({
        ip: '127.0.0.1', host: 'localhost',
        // eslint-disable-next-line no-unused-vars
      });
      return connection.close();
    }).timeout(dbConnectionTimeout);
    it('should be able to automatically select range with the smallest ip that has not been scanned', async function test() {
      const DbUtil = new DbUtilLib(4);
      const connection = await DbUtil.connect(
        {
          host: process.env.DB_HOST_TEST,
        },
      );
      await DbUtil.insert({ ip: '0.0.0.0', host: 'localhost' });
      await DbUtil.insert({ ip: '1.0.0.0', host: 'localhost' });
      await DbUtil.insert({ ip: '2.0.0.0', host: 'localhost' });
      await DbUtil.insert({ ip: '3.0.0.0', host: 'localhost' });

      await DbUtil.insert({ ip: '8.0.0.0', host: 'localhost' });
      await DbUtil.insert({ ip: '9.0.0.0', host: 'localhost' });
      await DbUtil.insert({ ip: '10.0.0.0', host: 'localhost' });

      // close the connection once it has been opened
      const rangeToScan = await DbUtil.getRangeToScan({ chunkSize: 256, maxOctets: [10, 256] });
      console.log(
        chalk.green('range to scan:\n'),
        JSON.stringify(
          rangeToScan,
          null,
          4,
        ),
      );
      assert.equal(rangeToScan.from, '4.0.*.*');
      return connection.close();
    }).timeout(longRunningDbOpsTimeout);
    it('should be able to automatically select range that has not been scanned', async function test() {
      const DbUtil = new DbUtilLib(4);
      const connection = await DbUtil.connect(
        {
          host: process.env.DB_HOST_TEST,
        },
      );
      await DbUtil.insert({ ip: '0.0.0.0', host: 'localhost' });
      await DbUtil.insert({ ip: '1.0.0.0', host: 'localhost' });
      await DbUtil.insert({ ip: '2.0.0.0', host: 'localhost' });
      await DbUtil.insert({ ip: '3.0.0.0', host: 'localhost' });
      await DbUtil.insert({ ip: '4.0.0.0', host: 'localhost' });
      await DbUtil.insert({ ip: '5.0.0.0', host: 'localhost' });

      await DbUtil.insert({ ip: '7.0.0.0', host: 'localhost' });
      await DbUtil.insert({ ip: '8.0.0.0', host: 'localhost' });
      await DbUtil.insert({ ip: '9.0.0.0', host: 'localhost' });
      await DbUtil.insert({ ip: '10.0.0.0', host: 'localhost' });

      // close the connection once it has been opened
      const rangeToScan = await DbUtil.getRangeToScan({ chunkSize: 256, maxOctets: [10, 256] });
      console.log(
        chalk.green('range to scan:\n'),
        JSON.stringify(
          rangeToScan,
          null,
          4,
        ),
      );
      assert.equal(rangeToScan.from, '6.0.*.*');
      return connection.close();
    }).timeout(longRunningDbOpsTimeout);
    it('should be able to automatically select the most outdated range to scan', async function test() {
      const DbUtil = new DbUtilLib(4);
      const connection = await DbUtil.connect(
        {
          host: process.env.DB_HOST_TEST,
        },
      );
      // swapped 0-2
      await DbUtil.insert({ ip: '2.0.0.0', host: 'localhost' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await DbUtil.insert({ ip: '1.0.0.0', host: 'localhost' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // swapped 0-2
      await DbUtil.insert({ ip: '0.0.0.0', host: 'localhost' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await DbUtil.insert({ ip: '3.0.0.0', host: 'localhost' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await DbUtil.insert({ ip: '4.0.0.0', host: 'localhost' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await DbUtil.insert({ ip: '5.0.0.0', host: 'localhost' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await DbUtil.insert({ ip: '6.0.0.0', host: 'localhost' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await DbUtil.insert({ ip: '7.0.0.0', host: 'localhost' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await DbUtil.insert({ ip: '8.0.0.0', host: 'localhost' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await DbUtil.insert({ ip: '9.0.0.0', host: 'localhost' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await DbUtil.insert({ ip: '10.0.0.0', host: 'localhost' });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // close the connection once it has been opened
      const rangeToScan = await DbUtil.getRangeToScan({ chunkSize: 256, maxOctets: [10, 256] });
      console.log(
        chalk.green('range to scan:\n'),
        JSON.stringify(
          rangeToScan,
          null,
          4,
        ),
      );
      assert.equal(rangeToScan.from, '2.0.*.*');
      return connection.close();
    }).timeout(longRunningDbOpsTimeout);
    it('should be able to automatically scan the ranges', async function test() {
      const DbUtil = new DbUtilLib(4);
      const connection = await DbUtil.connect(
        {
          host: process.env.DB_HOST_TEST,
        },
      );

      // close the connection once it has been opened
      const ranges = [
        { from: '188.184.37.219', to: '188.184.37.230' },
      ];
      const options = { chunkSize: 1, requestTimeout: 3000 };
      const scanResponse = await DbUtil.autoscanRanges(ranges, options);
      console.log(
        chalk.green('scanning result:\n'),
        JSON.stringify(
          scanResponse,
          null,
          4,
        ),
      );
      return connection.close();
    }).timeout(longRunningDbOpsTimeout);
  });
});
/* eslint-enable prefer-arrow-callback */

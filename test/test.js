/* eslint-env node, mocha */
import { IpUtil as IpUtilLib } from '../src/iputil';

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

// eslint-disable-next-line no-unused-vars
const chalk = require('chalk');

// eslint-disable-next-line no-unused-vars
function IpUtil(version = 4) {
  const addPadding = (number, totalNumberOfDigits) => {
    const missingZeros = totalNumberOfDigits - number.toString().length;
    let paddedString = number.toString();
    for (let i = 0; i < missingZeros; i++) {
      paddedString = `0${paddedString}`;
    }
    return paddedString;
  };
  const decimalToOctet = (nr) => addPadding((parseInt(nr, 10)).toString(2), 8);
  const decimalToIp = (nr) => {
    const raw = addPadding((parseInt(nr, 10)).toString(2), 32);
    const octetSplit = raw.match(/.{1,8}/g);
    return `${parseInt(octetSplit[0], 2)}.${parseInt(octetSplit[1], 2)}.${parseInt(octetSplit[2], 2)}.${parseInt(octetSplit[3], 2)}`;
  };
  const addBinary = (a, b) => {
    const dec = Number(parseInt(a, 2)) + Number(parseInt(b, 2));
    return dec.toString(2);
  };
  const incrementIp = (ipAddressString) => {
    const ipSplit = ipAddressString.split('.');
    const octetSplit = ipSplit.map((decimalPart) => decimalToOctet(decimalPart));
    const binaryIp = `${octetSplit[0]}${octetSplit[1]}${octetSplit[2]}${octetSplit[3]}`;
    const nextBinaryIp = addBinary(binaryIp, 1);
    const newPaddedBinaryIp = addPadding(nextBinaryIp.toString(10), 32);
    const newOctetSplit = newPaddedBinaryIp.match(/.{1,8}/g);
    const ip = `${parseInt(newOctetSplit[0], 2)}.${parseInt(newOctetSplit[1], 2)}.${parseInt(newOctetSplit[2], 2)}.${parseInt(newOctetSplit[3], 2)}`;
    return ip;
  };
  if (version !== 4) {
    throw new Error('Ip version not supported yet');
  }
  return {
    decimalToOctet,
    addBinary,
    decimalToIp,
    incrementIp,
    addPadding,
  };
}

module.exports = {
  IpUtil,
};

// eslint-disable-next-line no-unused-vars
require('dotenv').config();
const chalk = require('chalk');
const mongoose = require('mongoose');
const log = require('loglevel');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const IpUtilLib = require('./iputil');

const IpUtil = new IpUtilLib.IpUtil(4);

const { argv } = yargs(hideBin(process.argv));
const fileName = 'db.js';
const setupLogs = () => {
  const level = argv.loglevel || 'debug';
  log.setLevel(level);
  log.debug(chalk.yellow(`The log level of ${fileName} has been set to ${level}`));
};

const recordSchema = mongoose.Schema({
  ip: { type: String, index: true },
  host: { type: String, index: true },
  date: { type: String, index: true },
});
const recordModel = mongoose.model('Record', recordSchema);

// eslint-disable-next-line no-unused-vars
function DbUtil(version = 4) {
  setupLogs();
  this.mongoose = mongoose;
  this.recordSchema = recordSchema;
  this.Record = recordModel;

  const connect = async (
    options = { host: null, user: null },
  ) => {
    const host = options.host || process.env.DB_HOST;
    const user = options.user || process.env.DB_USER;
    log.info(chalk.white('Connecting to mongodb'), { host, user });
    await this.mongoose.connect(host, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: true,
      useCreateIndex: true,
    });
    return mongoose.connection;
  };
  const insert = async ({ ip, host }) => {
    const newRecord = new this.Record({ ip, host, date: new Date() });
    const response = await newRecord.save();
    if (response) {
      log.info(chalk.green('Successfully saved the the record to the database:'), JSON.stringify({ ip, host }));
    } else {
      log.error(chalk.red('Error saving the the record to the database'), { newRecord, response });
    }
    return response;
  };
  const find = async ({ ip, host }) => {
    if (ip && host) {
      await this.Record.find({ ip, host }).exec();
    } if (ip) {
      await this.Record.find({ ip }).exec();
    } if (host) {
      await this.Record.find({ host }).exec();
    }
  };
  const deleteAll = async ({ ip, host }) => {
    if (ip && host) {
      await this.Record.deleteMany({ ip, host }).exec();
    } if (ip) {
      await this.Record.deleteMany({ ip }).exec();
    } if (host) {
      await this.Record.deleteMany({ host }).exec();
    }
    log.info(chalk.green('successfully deleted the the records that match'), JSON.stringify({ ip, host }));
  };

  const getLatestRecordsInRange = async (ipRegex) => this.Record.find(
    {
      ip: {
        $regex: ipRegex,
      },
    },
  ).sort(
    {
      date: -1,
    },
  ).limit(1);

  const getLatestRecordForAllRanges = async (options) => {
    log.debug(chalk.white('finding the latest record for all ranges.'));
    const latestRecordsRequests = [];
    for (let i = 0; i < options.maxOctets[0]; i += 1) {
      for (let j = 0; j < options.maxOctets[1]; j += 1) {
        // const allRegex = /\d+\.\d+\.\d+\.\d+/;
        // eslint-disable-next-line no-useless-escape
        const range = `^${i}[.]${j}[.]\\d+[.]\\d+$`;
        const rangeRegex = new RegExp(range, 'g');
        // make async promises
        latestRecordsRequests.push({
          humanRange: `${i}.${j}.*.*`,
          range,
          rangeRegex,
          promise: getLatestRecordsInRange(range),
        });
      }
    }

    const requestChunkSize = options.chunkSize;
    log.debug(chalk.white(
      `performing ${latestRecordsRequests.length} request on ranges, in chunks of ${requestChunkSize} from ${latestRecordsRequests[0].humanRange} to ${latestRecordsRequests[latestRecordsRequests.length - 1].humanRange} `,
    ));

    let progess = 0;
    const latestRecordsInfo = [];
    // split the promise array into requestChunkSizes
    let i;
    let j;
    let tempLatestRecordsRequestChunk;
    for (i = 0, j = latestRecordsRequests.length; i < j; i += requestChunkSize) {
      tempLatestRecordsRequestChunk = latestRecordsRequests.slice(i, i + requestChunkSize);
      // eslint-disable-next-line no-await-in-loop
      progess = ((i / latestRecordsRequests.length) * 100).toFixed(2);
      const humanReadableRanges = tempLatestRecordsRequestChunk
        .map((request) => request.humanRange);
      log.debug(chalk.white(`${progess}% - querying last record in range ${humanReadableRanges[0]} - ${humanReadableRanges[humanReadableRanges.length - 1]}.`));
      // eslint-disable-next-line no-await-in-loop
      const promiseChunkReponse = await Promise.all(
        tempLatestRecordsRequestChunk
          .map((request) => request.promise),
      );
      const getLatestDocumentFromReponse = (chunkResponse) => {
        const records = chunkResponse.filter((latestRecords) => latestRecords.length > 0);
        return records.length > 0 ? records[0][0] : null;
      };
      const latestRecordInRange = {
        from: humanReadableRanges[0],
        to: humanReadableRanges[humanReadableRanges.length - 1],
        response: getLatestDocumentFromReponse(promiseChunkReponse),
      };
      latestRecordsInfo.push(latestRecordInRange);
      log.debug(chalk.green(`${progess}% - latest records: ${JSON.stringify(latestRecordInRange)}`));
    }
    log.debug(chalk.green('100% - latest records:\n'), latestRecordsInfo);
    return latestRecordsInfo;
  };
  const getRangesWithOldestRecord = (latestRecordsForRanges) => {
    const notScannedRanges = latestRecordsForRanges
      .filter((recordsForRange) => recordsForRange.response === null)
      .sort((a, b) => IpUtil.ipToDecimal(a.from.replace('*', '0')) - IpUtil.ipToDecimal(b.from.replace('*', '0')));
    const scannedRanges = latestRecordsForRanges
      .filter((recordsForRange) => recordsForRange.response !== null);
    const oldestRangeScanned = scannedRanges
      .sort((a, b) => new Date(a.response.date) - new Date(b.response.date));
    return [...notScannedRanges, ...oldestRangeScanned];
  };
  const getRangeToScan = async (options = { chunkSize: 1000, maxOctets: [256, 256] }) => {
    const latestRecordsForAllRanges = await getLatestRecordForAllRanges(options);
    const rangesWithOldestRecords = getRangesWithOldestRecord(latestRecordsForAllRanges);
    return {
      from: rangesWithOldestRecords[0].from,
      to: rangesWithOldestRecords[0].to,
    };
  };
  return {
    connect,
    insert,
    find,
    deleteAll,
    getLatestRecordsInRange,
    getLatestRecordForAllRanges,
    getRangesWithOldestRecord,
    getRangeToScan,
  };
}

module.exports = {
  DbUtil,
};

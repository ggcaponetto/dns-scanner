// eslint-disable-next-line no-unused-vars
require('dotenv').config();
const chalk = require('chalk');
const mongoose = require('mongoose');
const log = require('loglevel');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const { argv } = yargs(hideBin(process.argv));
const fileName = 'db.js';
const setupLogs = () => {
  const level = argv.loglevel || 'debug';
  log.setLevel(level);
  log.debug(chalk.yellow(`The log level of ${fileName} has been set to ${level}`));
};
// eslint-disable-next-line no-unused-vars
function DbUtil(version = 4) {
  setupLogs();
  this.recordSchema = new mongoose.Schema({
    ip: { type: String, index: true },
    host: { type: String, index: true },
    date: { type: String, index: true },
  });
  this.Record = mongoose.model('Record', this.recordSchema);

  const connect = (onConnectionOpen, onConnectionClose) => {
    const host = process.env.DB_HOST;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASS;
    log.info(chalk.white('Connecting to mongodb'), { host, user, password });
    mongoose.connect(host, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: true,
      useCreateIndex: true,
    });
    mongoose.connection.on('error', (e) => {
      log.error(chalk.red('Error connecting to mongodb'), e);
    });
    mongoose.connection.once('open', () => {
      // we're connected!
      log.info(chalk.green('Connection open to mongodb'), { host, user });
      onConnectionOpen();
    });
    mongoose.connection.on('close', () => {
      log.info(chalk.green('Connection gracefully closed to mongodb'), { host, user });
      onConnectionClose();
    });
    return { mongoose };
  };
  const insert = async ({ ip, host }, onInsertComplete) => {
    const newRecord = new this.Record({ ip, host, date: new Date() });
    await newRecord.save((err, savedRecord) => {
      if (err) {
        log.error(chalk.red('Error saving the the record to the database'), { newRecord, err });
      } else {
        log.info(chalk.green('Successfully saved the the record to the database:', JSON.stringify({ ip, host })));
      }
      onInsertComplete(err, savedRecord);
    });
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
  const countRecordsInIpRange = async (ipRegex) => this.Record.aggregate([
    {
      $match: {
        ip: {
          $regex: ipRegex,
        },
      },
    },
    {
      $count: 'count',
    },
  ]);
  const getLatestRecordInRange = async (ipRegex) => this.Record.find(
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
  const getScannedRanges = async () => {
    log.debug(chalk.white('finding an ip range to scan.'));
    const countRequests = [];

    for (let i = 0; i < 256; i += 1) {
      for (let j = 0; j < 256; j += 1) {
        // const allRegex = /\d+\.\d+\.\d+\.\d+/;
        // eslint-disable-next-line no-useless-escape
        const range = `^${i}[.]${j}[.]\\d+[.]\\d+$`;
        const rangeRegex = new RegExp(range, 'g');
        // make async promises
        countRequests.push({
          humanRange: `${i}.${j}.*.*`,
          range,
          rangeRegex,
          promise: countRecordsInIpRange(range),
        });
      }
    }

    let documentsCount = 0;
    let progess = 0;
    const rangeInfoArray = [];
    // split the promise array into chunks
    let i; let j; let tempCountRequestsChunk; const chunk = 2000;
    for (i = 0, j = countRequests.length; i < j; i += chunk) {
      tempCountRequestsChunk = countRequests.slice(i, i + chunk);
      // eslint-disable-next-line no-await-in-loop
      progess = ((i / countRequests.length) * 100).toFixed(2);
      const humanReadableRanges = tempCountRequestsChunk
        .map((countRequest) => countRequest.humanRange);
      log.debug(chalk.white(`${progess}% - querying document count in range ${humanReadableRanges[0]} - ${humanReadableRanges[humanReadableRanges.length - 1]}.`));
      // eslint-disable-next-line no-await-in-loop
      const promiseChunkReponse = await Promise.all(
        tempCountRequestsChunk.map((countRequest) => countRequest.promise),
      );
      let documentsInRange = 0;
      for (let k = 0; k < promiseChunkReponse.length; k += 1) {
        if (promiseChunkReponse[k][0]) {
          const partialCount = promiseChunkReponse[k][0].count;
          documentsInRange += partialCount;
          documentsCount += documentsInRange;
        }
        /* log.debug(chalk.white(
          `${progess}% - found ${documentsInRange} document in range `
          + `${humanReadableRanges[0]} - ${humanReadableRanges[humanReadableRanges.length - 1]}.`,
        )); */
      }
      rangeInfoArray.push(
        {
          from: humanReadableRanges[0].replace('*', '0'),
          to: humanReadableRanges[humanReadableRanges.length - 1].replace('*', '0'),
          documentCount: documentsInRange,
        },
      );
      log.debug(chalk.white(`${progess}% - partial count: ${documentsCount}`));
    }
    log.debug(chalk.green(`100% - documents count: ${documentsCount}`));
    return rangeInfoArray.sort((a, b) => a.documentCount - b.documentCount);
  };
  const getLatestRecordForAllRanges = async () => {
    log.debug(chalk.white('finding the latest record for all ranges.'));
    const latestRecordsRequests = [];
    for (let i = 0; i < 256; i += 1) {
      for (let j = 0; j < 256; j += 1) {
        // const allRegex = /\d+\.\d+\.\d+\.\d+/;
        // eslint-disable-next-line no-useless-escape
        const range = `^${i}[.]${j}[.]\\d+[.]\\d+$`;
        const rangeRegex = new RegExp(range, 'g');
        // make async promises
        latestRecordsRequests.push({
          humanRange: `${i}.${j}.*.*`,
          range,
          rangeRegex,
          promise: getLatestRecordInRange(range),
        });
      }
    }

    let progess = 0;
    const latestRecordsInfo = [];
    // split the promise array into chunks
    let i; let j; let tempCountRequestsChunk; const chunk = 1000;
    for (i = 0, j = latestRecordsRequests.length; i < j; i += chunk) {
      tempCountRequestsChunk = latestRecordsRequests.slice(i, i + chunk);
      // eslint-disable-next-line no-await-in-loop
      progess = ((i / latestRecordsRequests.length) * 100).toFixed(2);
      const humanReadableRanges = tempCountRequestsChunk
        .map((countRequest) => countRequest.humanRange);
      log.debug(chalk.white(`${progess}% - querying last record in range ${humanReadableRanges[0]} - ${humanReadableRanges[humanReadableRanges.length - 1]}.`));
      // eslint-disable-next-line no-await-in-loop
      const promiseChunkReponse = await Promise.all(
        tempCountRequestsChunk.map((countRequest) => countRequest.promise),
      );
      latestRecordsInfo.push(promiseChunkReponse);
      log.debug(chalk.green(`${progess}% - latest records: ${JSON.stringify(promiseChunkReponse)}`));
    }
    log.debug(chalk.green(`100% - latest records: ${latestRecordsInfo}`));
    return latestRecordsInfo;
  };
  return {
    connect,
    insert,
    find,
    deleteAll,
    getScannedRanges,
    getLatestRecordInRange,
    getLatestRecordForAllRanges,
  };
}

module.exports = {
  DbUtil,
};

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
    log.info(chalk.white('connecting to mongodb'), { host, user, password });
    mongoose.connect(host, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: true,
      useCreateIndex: true,
    });
    mongoose.connection.on('error', (e) => {
      log.error(chalk.red('connecting to mongodb'), e);
    });
    mongoose.connection.once('open', () => {
      // we're connected!
      log.info(chalk.green('connection open to mongodb'), { host, user });
      onConnectionOpen();
    });
    mongoose.connection.on('close', () => {
      log.info(chalk.green('connection gracefully closed to mongodb'), { host, user });
      onConnectionClose();
    });
    return { mongoose };
  };
  const insert = async ({ ip, host }, onInsertComplete) => {
    const newRecord = new this.Record({ ip, host, date: new Date() });
    await newRecord.save((err, savedRecord) => {
      if (err) {
        log.error(chalk.red('error saving the the record to the database'), { newRecord, err });
      } else {
        log.info(chalk.green(`successfully saved the the record to the database (${ip}: ${host})`));
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
    log.info(chalk.green('successfully deleted the the records that match'), { ip, host });
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
  const findRangeToScan = async () => {
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
      log.debug(chalk.white(`${progess}% - partial count: ${documentsCount}`));
    }
    log.debug(chalk.green(`${progess}% - documents count: ${documentsCount}`));
  };
  return {
    connect,
    insert,
    find,
    deleteAll,
    findRangeToScan,
  };
}

module.exports = {
  DbUtil,
};

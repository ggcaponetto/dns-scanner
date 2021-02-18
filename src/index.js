#!/usr/bin/env node

require('dotenv').config();
const chalk = require('chalk');
const shell = require('shelljs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const log = require('loglevel');
const IpUtilLib = require('./iputil');
const DbUtilLib = require('./db');
const { ArgumentsError } = require('./arguments-error');

const IpUtil = new IpUtilLib.IpUtil(4);
const DbUtil = new DbUtilLib.DbUtil();
const fileName = 'index.js';

const { argv } = yargs(hideBin(process.argv));

function dig(ip) {
  const digCommand = `dig ${ip.split('.').reverse().join('.')}.in-addr.arpa PTR`;
  log.info(chalk.white(`digging ip ${ip}: ${digCommand}`));
  let record = { ip, host: '' };
  try {
    const child = shell.exec(digCommand, {
      async: false,
      silent: true,
      fatal: false,
    });
    if (child.code !== 0) {
      log.warn(chalk.red(`Error performing ${digCommand} (code:${child.code})`), child.code);
    } else {
      // console.log(chalk.yellow(`${digCommand} output:`, child.stdout));
      const lines = child.stdout.split('\n');
      lines.forEach((line, lineIndex) => {
        if (
          line.startsWith(';; AUTHORITY SECTION:')
          || line.startsWith(';; ANSWER SECTION:')
        ) {
          // console.log(chalk.yellow(`${digCommand} output:`, lines[lineIndex+1]));
          const tabs = lines[lineIndex + 1].split('\t');
          tabs.forEach((tab, tabIndex, tabArray) => {
            // console.log(chalk.white(`tab ${tabIndex}:`, tab));
            if (tab.startsWith('PTR')) {
              const ptrParts = tabArray.slice(tabIndex + 1);
              log.info(`${chalk.whiteBright('PTR:')} ${chalk.green(ptrParts)}`);
              record = { ip, host: ptrParts[0] };
            }
          });
        }
      });
    }
    return record;
  } catch (e) {
    log.error(chalk.red(`Error performing ${digCommand}`), e);
    return record;
  }
}

const setupLogs = () => {
  const level = argv.loglevel || 'debug';
  log.setLevel(level);
  log.debug(chalk.yellow(`The log level of ${fileName} has been set to ${argv.loglevel}`));
};
setupLogs();

async function run(mode, from, to, onRecordSaved) {
  const openConnection = async () => {
    const connectionResult = await DbUtil.connect();
    log.info(chalk.green('MongoDB connection opened.'));
    return connectionResult;
  };
  async function startScanning() {
    const connection = await openConnection();
    log.info(chalk.blue('Starting DNS-Scanner'));
    // const logLevel = log.getLevel();
    const scanWeb = async (fromIp, toIp) => {
      const ranges = [
        { from: fromIp, to: toIp },
      ];
      const options = { chunkSize: 128, requestTimeout: 1000 };
      const rangesResponse = await DbUtil.autoscanRanges(ranges, options);
      log.info(chalk.green('curl response for all ip\'s:\n'), JSON.stringify(rangesResponse, null, 4));
      for (let rangeIndex = 0; rangeIndex < rangesResponse.length; rangeIndex += 1) {
        const rangeResponse = rangesResponse[rangeIndex];
        for (
          let responseIndex = 0; responseIndex < rangeResponse.response.length; responseIndex += 1
        ) {
          const singleResponse = rangeResponse.response[responseIndex];
          const record = {
            ip: singleResponse.ip,
            httpStatus: singleResponse.httpStatus,
            host: singleResponse.httpStatus >= 200 ? dig(singleResponse.ip).host : null,
          };
          const progress = ((responseIndex / rangeResponse.response.length) * 100).toFixed(4);
          log.info(chalk.white(`curl + dig progress: ${progress}%`), JSON.stringify(record));
          // eslint-disable-next-line no-await-in-loop
          await DbUtil.deleteAll(record);
          // eslint-disable-next-line no-await-in-loop
          await DbUtil.insert(record, (err, savedRecord) => {
            // close the connection once it has been opened
            if (err) {
              log.error(chalk.red('Error saving into database'), { record, err });
            } else {
              log.info(chalk.green(`Saved into database ${JSON.stringify({ ip: savedRecord.ip, host: savedRecord.host, httpStatus: savedRecord.httpStatus })}`));
              onRecordSaved(savedRecord.ip);
            }
          });
        }
      }
      log.info(chalk.green('Scanned  100%'));
      return Promise.resolve();
    };
    if (mode === 'web') {
      await scanWeb(from, to);
      const closed = await connection.close();
      log.info(chalk.green('MongoDB connection gracefully closed.'));
      return closed;
    }
    throw new ArgumentsError(`Unsupported scanning mode '${mode}'`);
  }
  log.info(chalk.blue(`(Restart) Scanning in ${mode} mode`));
  const scanResult = await startScanning();
  log.info(chalk.green('Scanning finished'));
  return scanResult;
}

(async () => {
  async function runProgram(
    mode = argv.mode,
    from = argv.from,
    to = argv.to,
  ) {
    let lastSavedRecord = from;
    try {
      return run(mode, from, to, (ip) => {
        lastSavedRecord = ip;
      });
    } catch (e) {
      // Deal with the fact the chain failed
      if (e instanceof ArgumentsError) {
        log.error(chalk.red(
          'The script has been invoked with wrong arguments. Please check the documentation with "node index.js --help".'
          + 'The dns-scanner will exit now.',
        ), e);
        process.exit(1);
      }
      log.error(chalk.red(`Scanning process had an unexpected error on ip ${lastSavedRecord}. Restarting the process.`), e);
      return runProgram(mode, lastSavedRecord, to);
    }
  }
  await runProgram();
})();

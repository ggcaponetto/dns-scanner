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
  const digCommand = `dig ${ip}.in-addr.arpa PTR`;
  log.info(chalk.white(`digging ip ${ip}: ${digCommand}`));
  let record = null;
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
async function run(mode, from, to, onRecordSaved) {
  // const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const openConnection = async () => {
    const connectionResult = await DbUtil.connect(
      async () => Promise.resolve(),
      () => Promise.reject(),
    );
    log.info(chalk.green('MongoDB connection opened.'));
    return connectionResult;
  };
  setupLogs();

  async function startScanning() {
    await openConnection();
    log.info(chalk.blue('Starting DNS-Scanner'));
    const logLevel = log.getLevel();
    log.info(chalk.blue(`Scanning in ${mode} mode`));
    if (mode === 'sequence') {
      log.info(chalk.white(`Starting sequence scan from ${from} to ${to} (loglevel: ${logLevel})`));
      const distance = IpUtil.getDistance(from, to);
      let tempIp = from;
      for (let i = 0; i < distance; i += 1) {
        const progress = ((i / distance) * 100).toFixed(4);
        tempIp = IpUtil.incrementIp(tempIp);
        if (i % (logLevel === 1 ? 1 : 100000000) === 0) {
          log.info(chalk.white(`Scanning ${tempIp}  ${progress}%`));
        }
        const record = dig(tempIp);
        if (record) {
          // eslint-disable-next-line no-await-in-loop
          await DbUtil.deleteAll(record);
          // eslint-disable-next-line no-await-in-loop
          await DbUtil.insert(record, (err, savedRecord) => {
            // close the connection once it has been opened
            if (err) {
              log.error(chalk.red('Error saving into database'), { record, err });
            } else {
              log.info(chalk.green(`Saved into database ${JSON.stringify({ ip: savedRecord.ip, host: savedRecord.host })}`));
              onRecordSaved(savedRecord.ip);
            }
          });
        } else {
          log.debug(chalk.green(`Nothing to save into the database for ip ${tempIp}`), { record, tempIp });
        }
      }
      log.info(chalk.green('Scanned  100%'));
    } else if (mode === 'auto') {
      throw new ArgumentsError(`Unsupported scanning mode '${mode}'`);
    } else if (mode === 'random') {
      throw new ArgumentsError(`Unsupported scanning mode '${mode}'`);
    } else {
      throw new ArgumentsError(`Unsupported scanning mode '${mode}'`);
    }
  }
  await startScanning();
}
(async () => {
  async function runProgram(mode = argv.mode, from = argv.from, to = argv.to) {
    let lastSavedRecord = from;
    try {
      await run(mode, from, to, (ip) => {
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
      await runProgram(mode, lastSavedRecord, to, (ip) => {
        lastSavedRecord = ip;
      });
    }
  }
  await runProgram();
})();

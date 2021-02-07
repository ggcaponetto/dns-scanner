#!/usr/bin/env node
require('dotenv').config();
const chalk = require('chalk');
const shell = require('shelljs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const log = require('loglevel');
const IpUtilLib = require('./iputil');

const IpUtil = new IpUtilLib.IpUtil(4);

const { argv } = yargs(hideBin(process.argv));

function dig(ip) {
  const digCommand = `dig ${ip}.in-addr.arpa PTR`;
  log.info(chalk.white(`digging ip ${ip}: ${digCommand}`));
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
            }
          });
        }
      });
    }
  } catch (e) {
    log.error(chalk.red(`Error performing ${digCommand}`), e);
  }
}

const setupLogs = () => {
  log.setLevel(argv.loglevel);
  log.debug(chalk.yellow(`The log level has been set to ${argv.loglevel}`));
};
function run() {
  const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  setupLogs();
  log.info(chalk.blue('Starting DNS-Scanner'), process.env);
  const logLevel = log.getLevel();
  log.info(chalk.blue(`Scanning in ${argv.mode} mode`));
  if (argv.mode === 'sequence') {
    log.info(chalk.white(`Starting sequence scan from ${argv.from} to ${argv.to} (loglevel: ${logLevel})`));
    const distance = IpUtil.getDistance(argv.from, argv.to);
    let tempIp = argv.from;
    for (let i = 0; i < distance; i += 1) {
      const progress = ((i / distance) * 100).toFixed(4);
      tempIp = IpUtil.incrementIp(tempIp);
      if (i % (logLevel === 1 ? 1 : 100000000) === 0) {
        log.info(chalk.white(`Scanning ${tempIp}  ${progress}%`));
      }
      dig(tempIp);
    }
    log.info(chalk.green('Scanned  100%'));
  } else if (argv.mode === 'random') {
    log.warn(chalk.red('Random scanning is not supported yet'));
  }
}
run();

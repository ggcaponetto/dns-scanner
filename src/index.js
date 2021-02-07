#!/usr/bin/env node
const chalk = require('chalk');
const shell = require('shelljs');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const { argv } = yargs(hideBin(process.argv));

console.log(chalk.blue('Starting DNS-Scanner'));

function dig(ip, counter) {
  const digCommand = `dig ${ip[3]}.${ip[2]}.${ip[1]}.${ip[0]}.in-addr.arpa PTR`;
  console.log(chalk.blue(`digging ip ${ip[0]}.${ip[1]}.${ip[2]}.${ip[3]} (counter: ${counter}): ${digCommand}`));
  try {
    const child = shell.exec(digCommand, {
      async: false,
      silent: true,
      fatal: false,
    });
    if (child.code !== 0) {
      console.log(chalk.red(`Error performing ${digCommand}`), child.code);
    } else {
      // console.log(chalk.yellow(`${digCommand} output:`, child.stdout));
      const lines = child.stdout.split('\n');
      lines.forEach((line, index, array) => {
        if (
          line.startsWith(';; AUTHORITY SECTION:')
          || line.startsWith(';; ANSWER SECTION:')
        ) {
          // console.log(chalk.yellow(`${digCommand} output:`, lines[index+1]));
          const tabs = lines[index + 1].split('\t');
          tabs.forEach((tab, index, tabArray) => {
            // console.log(chalk.white(`tab ${index}:`, tab));
            if (tab.startsWith('PTR')) {
              const ptrParts = tabArray.slice(index + 1);
              console.log(chalk.white('PTR:', ptrParts));
            }
          });
        }
      });
    }
  } catch (e) {
    console.log(chalk.red(`Error performing ${digCommand} (counter: ${counter})`));
  }
}

function run() {
  const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(chalk.blue(`Scanning in ${argv.mode} mode`));
  if (argv.mode === 'sequence') {
    console.log(chalk.white(`Starting sequence scan from ${argv.from} to ${argv.to}`));
  } else if (argv.mode === 'random') {
    console.log(chalk.red('Random scanning is not supported yet'));
  }
  console.log(chalk.blue('Scanned all addresses.'));
}
run();

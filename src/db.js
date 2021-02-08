// eslint-disable-next-line no-unused-vars
require('dotenv').config();
const chalk = require('chalk');
const mongoose = require('mongoose');
const log = require('loglevel');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const { argv } = yargs(hideBin(process.argv));

const setupLogs = () => {
  const level = argv.loglevel || 'debug';
  log.setLevel(level);
  log.debug(chalk.yellow(`The log level has been set to ${level}`));
};
// eslint-disable-next-line no-unused-vars
function DbUtil(version = 4) {
  setupLogs();
  const connect = (onConnectionOpen, onConnectionClose) => {
    const host = process.env.DB_HOST;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASS;
    log.info(chalk.white('connecting to mongodb'), { host, user, password });
    mongoose.connect(host, { useNewUrlParser: true, useUnifiedTopology: true });
    mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
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
  const disconnect = () => {

  };
  return {
    connect,
    disconnect,
  };
}

module.exports = {
  DbUtil,
};

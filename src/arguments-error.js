class ArgumentsError extends Error {
  constructor(message) {
    super(message); // (1)
    this.name = 'ArgumentsError'; // (2)
  }
}
module.exports = {
  ArgumentsError,
};

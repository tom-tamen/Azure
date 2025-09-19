function createContext() {
  return {
    invocationId: "test",
    bindings: {},
    log: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      verbose: jest.fn()
    },
    res: undefined
  };
}

module.exports = { createContext };

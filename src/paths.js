'use strict';
const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(path.join(DATA_DIR, 'cache'), { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'credentials'), { recursive: true, mode: 0o700 });

module.exports = { DATA_DIR };

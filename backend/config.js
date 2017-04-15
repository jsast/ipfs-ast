'use strict';

const config = {
  debug: process.env.NODE_ENV !== 'production',
  port: process.env.PORT || 7001
};

module.exports = config;

/**
 * The configuration file.
 */
const fs = require('fs')

function fileIfExists (path) {
  return fs.existsSync(path) ? path : null
}

module.exports = {
  DISABLE_LOGGING: process.env.DISABLE_LOGGING ? Boolean(process.env.DISABLE_LOGGING) : false,
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',

  KAFKA_URL: process.env.KAFKA_URL || 'localhost:9092',
  // below two params are used for secure Kafka connection, they are optional
  // for the local Kafka, they are not needed
  KAFKA_CLIENT_CERT: process.env.KAFKA_CLIENT_CERT || fileIfExists('./kafkadev.cert'),
  KAFKA_CLIENT_CERT_KEY: process.env.KAFKA_CLIENT_CERT_KEY || fileIfExists('./kafkadev.key'),
  // Kafka topics to listen to
  TOPICS: (process.env.TOPICS && process.env.TOPICS.split(',')) || ['submission.notification.create',
    'submission.notification.update'
  ],

  AUTH0_URL: process.env.AUTH0_URL,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || 'https://m2m.topcoder-dev.com/',
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME || 86400000,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,

  PAYLOAD_RESOURCE: process.env.PAYLOAD_RESOURCE || 'review',
  PAYLOAD_TYPE_ID: process.env.PAYLOAD_TYPE_ID || 'e6ca06fe-bec5-41bb-afac-636860fb39a7',
  SUBMISSION_PHASE_TYPE: process.env.SUBMISSION_PHASE_TYPE || 'Submission',

  GET_SUBMISSION_DETAILS_URL: process.env.GET_SUBMISSION_DETAILS_URL ||
    'https://api.topcoder-dev.com/v5/submissions/{submissionId}',
  GET_CHALLENGE_DETAILS_URL: process.env.GET_CHALLENGE_DETAILS_URL ||
    'https://api.topcoder-dev.com/v3/challenges/{challengeId}',
  GET_SUBMISSION_REVIEW_DETAILS_URL: process.env.GET_SUBMISSION_REVIEW_DETAILS_URL ||
    'https://api.topcoder-dev.com/v5/reviews/{reviewId}',
  GET_REVIEW_SUMMATION_URL: process.env.GET_REVIEW_SUMMATION_URL ||
    'https://api.topcoder-dev.com/v5/reviewSummations?submissionId={submissionId}',
  CREATE_REVIEW_SUMMATION_URL: process.env.CREATE_REVIEW_SUMMATION_URL ||
    'https://api.topcoder-dev.com/v5/reviewSummations',
  UPDATE_REVIEW_SUMMATION_URL: process.env.UPDATE_REVIEW_SUMMATION_URL ||
    'https://api.topcoder-dev.com/v5/reviewSummations/{reviewSummationId}'
}

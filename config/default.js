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
  // Kafka group id
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || 'aggregate-scorer-processor',
  // Kafka topics to listen to
  TOPICS: process.env.TOPICS ? process.env.TOPICS.split(',') : 'submission.notification.create,submission.notification.update'.split(','),

  AUTH0_URL: process.env.AUTH0_URL,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || 'https://m2m.topcoder-dev.com/',
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME || 86400000,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
  AUTH0_PROXY_SERVER_URL: process.env.AUTH0_PROXY_SERVER_URL,

  PAYLOAD_RESOURCE: process.env.PAYLOAD_RESOURCE || 'review',
  PAYLOAD_TYPE_IDS: process.env.PAYLOAD_TYPE_IDS ? process.env.PAYLOAD_TYPE_IDS.split(',') : 'e6ca06fe-bec5-41bb-afac-636860fb39a7'.split(','),
  SUBMISSION_PHASE_TYPE: process.env.SUBMISSION_PHASE_TYPE || 'Submission',

  GET_SUBMISSION_DETAILS_URL: process.env.GET_SUBMISSION_DETAILS_URL ||
    'https://api.topcoder-dev.com/v5/submissions/{submissionId}',
  GET_CHALLENGE_DETAILS_URL: process.env.GET_CHALLENGE_DETAILS_URL ||
    'https://api.topcoder-dev.com/v5/challenges?legacyId={challengeId}',
  GET_CHALLENGE_SUBMISSION_URL: process.env.GET_CHALLENGE_SUBMISSION_URL ||
    'https://api.topcoder-dev.com/v5/submissions?challengeId={challengeId}',
  GET_SUBMISSION_REVIEW_DETAILS_URL: process.env.GET_SUBMISSION_REVIEW_DETAILS_URL ||
    'https://api.topcoder-dev.com/v5/reviews/{reviewId}',
  GET_REVIEW_SUMMATION_URL: process.env.GET_REVIEW_SUMMATION_URL ||
    'https://api.topcoder-dev.com/v5/reviewSummations?submissionId={submissionId}',
  CREATE_REVIEW_SUMMATION_URL: process.env.CREATE_REVIEW_SUMMATION_URL ||
    'https://api.topcoder-dev.com/v5/reviewSummations',
  UPDATE_REVIEW_SUMMATION_URL: process.env.UPDATE_REVIEW_SUMMATION_URL ||
    'https://api.topcoder-dev.com/v5/reviewSummations/{reviewSummationId}',
  RDM_TAGS: process.env.RDM_TAGS ? process.env.RDM_TAGS.split(',') : 'Easy,Medium,Hard'.split(','),
  RDM_CHALLENGE_INFO: {
    EASY: {
      totalTime: parseInt(process.env.RDM_EASY_TIME, 10) || 48, // hours
      maxPoints: parseInt(process.env.RDM_EASY_MAX_POINTS, 10) || 250,
      difficulty: 'Easy',
      challengeIds: process.env.RDM_EASY_CHALLENGE_IDS ? process.env.RDM_EASY_CHALLENGE_IDS.split(',') : '30052924'.split(',')
    },
    MEDIUM: {
      totalTime: parseInt(process.env.RDM_MEDIUM_TIME, 10) || 48, // hours
      maxPoints: parseInt(process.env.RDM_MEDIUM_MAX_POINTS, 10) || 500,
      difficulty: 'Medium',
      challengeIds: process.env.RDM_MEDIUM_CHALLENGE_IDS ? process.env.RDM_MEDIUM_CHALLENGE_IDS.split(',') : '30004319,30057476'.split(',')
    },
    HARD: {
      totalTime: parseInt(process.env.RDM_HARD_TIME, 10) || 48, // hours
      maxPoints: parseInt(process.env.RDM_HARD_MAX_POINTS, 10) || 800,
      difficulty: 'Hard',
      challengeIds: process.env.RDM_HARD_CHALLENGE_IDS ? process.env.RDM_HARD_CHALLENGE_IDS.split(',') : '30004317'.split(',')
    }
  },
  SCORE_CARD_ID: process.env.SCORE_CARD_ID || 30001850,
  SCORE_DECIMALS: process.env.SCORE_DECIMALS || 2,
  TAG_EASY: process.env.TAG_EASY || 'Easy',
  TAG_MEDIUM: process.env.TAG_MEDIUM || 'Medium',
  TAG_HARD: process.env.TAG_HARD || 'Hard',
  EASY_SCORE_ARRAY: process.env.EASY_SCORE_ARRAY ? process.env.EASY_SCORE_ARRAY.split(',') : '10,5,2'.split(','),
  MEDIUM_SCORE_ARRAY: process.env.MEDIUM_SCORE_ARRAY ? process.env.MEDIUM_SCORE_ARRAY.split(',') : '20,10,5'.split(','),
  HARD_SCORE_ARRAY: process.env.HARD_SCORE_ARRAY ? process.env.HARD_SCORE_ARRAY.split(',') : '30,15,10'.split(',')
}

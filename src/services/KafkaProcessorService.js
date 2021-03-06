/**
 * Kafka processor service.
 */
const Joi = require('joi')
const _ = require('lodash')
const config = require('config')
const logger = require('../common/logger')
const helper = require('../common/helper')

/**
 * Handle Kafka message. Returns whether the message is successfully handled. If message is not handled, then it is ignored.
 * @param {Object} submission the Submission object
 * @param {Array} scoreArray the array of score
 * @param {String} token the m2m token
 * @param {Object} reviewDetails the review object
 * @returns {Boolean} whether the message is successfully handled
 */
async function calcF2FScore (submission, scoreArray, token, reviewDetails) {
  logger.info('F2F Contest detected. Calculating score using F2F specific formula')
  let aggregateScore = 0
  // get all submissions of the challenge
  const challengeSubmissions = await helper.getChallengeSubmissions(submission.challengeId, token)

  const beforeMemberIds = _(challengeSubmissions).filter(cs => cs.memberId !== submission.memberId &&
      new Date(cs.created) < new Date(submission.created)).map('memberId').uniq().value()

  if (beforeMemberIds.length < scoreArray.length) {
    aggregateScore = parseInt(scoreArray[beforeMemberIds.length], 10)
  } else {
    aggregateScore = parseInt(_.last(scoreArray))
  }

  aggregateScore = Number(aggregateScore.toFixed(config.SCORE_DECIMALS))

  const reviewSummation = {
    aggregateScore,
    isPassing: true,
    scoreCardId: config.SCORE_CARD_ID,
    submissionId: submission.id,
    metadata: reviewDetails.metadata || {}
  }

  logger.info(`Save review summation for F2F: ${JSON.stringify(reviewSummation, null, 4)}`)
  await helper.saveSubmissionReviewSummation(submission.id, reviewSummation, token)

  logger.info('The Kafka message is successfully processed.')
  return true
}

/**
 * Returns the RDM score for the given parameters
 * @param {Number} passingTests Number of test cases that passed
 * @param {Number} totalTests Number of test cases in total
 * @param {Number} maxPoints Maximum points for that contest
 * @param {Number} passedTime Total phase time in hours
 * @param {Number} totalTime Total phase time in minutes
 */
function getRDMScore (passingTests, totalTests, maxPoints, passedTime, totalTime) {
  console.log(passingTests, totalTests, maxPoints, passedTime, totalTime)
  const numerator = 0.7 * totalTime * totalTime
  const denominator = (10 * passedTime * passedTime) + (totalTime * totalTime)
  const factor = 0.3 + (numerator / denominator)
  const testsRatio = passingTests / totalTests
  return testsRatio * maxPoints * factor
}

/**
 * Handle Kafka message. Returns whether the message is successfully handled. If message is not handled, then it is ignored.
 * @param {Object} message the Kafka message in JSON format
 * @returns {Boolean} whether the message is successfully handled
 */
async function handle (message) {
  // log message
  logger.info(`Kafka message: ${JSON.stringify(message, null, 4)}`)
  // get m2m token
  const token = await helper.getM2Mtoken()
  // get submission
  const submissionId = message.payload.submissionId
  const submission = await helper.getSubmissionDetails(submissionId, token)
  const submissionCreatedDate = new Date(submission.created)
  // get challenge
  const challengeId = submission.challengeId
  const challenge = await helper.getChallengeDetails(challengeId, token)
  // get submission phase start time
  const phases = _.get(challenge, 'phases', [])
  const submissionPhase = _.find(phases, (phase) => phase.name === config.SUBMISSION_PHASE_TYPE)
  if (!submissionPhase) {
    throw new Error('Failed to find submission phase from challenge details.')
  }
  if (!submissionPhase.actualStartDate) {
    throw new Error('Submission phase has no actual start date')
  }
  const submissionPhaseStartedDate = new Date(submissionPhase.actualStartDate)
  if (submissionCreatedDate < submissionPhaseStartedDate) {
    throw new Error('Submission created time is earlier than submission phase actual start time.')
  }

  const submissionPhaseEndDate = Date.parse(_.get(submissionPhase, 'scheduledEndDate'), '')

  const timeSince = submissionCreatedDate.getTime() - submissionPhaseStartedDate.getTime()
  const timeLeft = submissionPhaseEndDate - submissionCreatedDate.getTime()
  const totalTime = submissionPhaseEndDate - submissionPhaseStartedDate.getTime()

  const tags = _.get(challenge, 'tags', [])
  logger.debug(`Tags on the contest with id ${challengeId} are ${tags}`)

  const reviewDetails = message.payload

  if (_.intersection(tags, config.RDM_TAGS).length > 0) {
    logger.info('RDM Contest detected. Calculating score using RDM specific formula')
    let aggregateScore = 0

    if (!reviewDetails.metadata) {
      throw Error('RDM contest review does not have tests metadata')
    }

    const tests = reviewDetails.metadata.assertions || reviewDetails.metadata.tests

    const testsPassed = tests.passed ? tests.passed : (tests.total - tests.pending - tests.failed)
    const totalTests = tests.total

    let foundDifficulty = false

    _.forEach(config.RDM_CHALLENGE_INFO, (val, key) => {
      const { totalTime: challengeDifficultyTotalTime, maxPoints, tags: challengeDifficultyTags } = val
      if (_.intersection(challengeDifficultyTags, tags).length > 0) {
        foundDifficulty = true
        logger.debug('Configuration used for the RDM calculation:')
        logger.debug(`totalTime: ${challengeDifficultyTotalTime}, maxPoints: ${maxPoints}, challengeId: ${challengeId}`)
        // Time since is in milliseconds. But total time is in seconds.
        // Hence, converting total time to milliseconds too
        aggregateScore = getRDMScore(testsPassed, totalTests, maxPoints, timeSince, challengeDifficultyTotalTime * 1000)
      }
    })

    if (!foundDifficulty) {
      const { totalTime: challengeDifficultyTotalTime, maxPoints } = config.RDM_CHALLENGE_INFO.EASY
      logger.debug('No difficulty detected in the challenge tags. Defaulting to using the EASY configuration for the RDM calculation:')
      logger.debug(`totalTime: ${challengeDifficultyTotalTime}, maxPoints: ${maxPoints}, challengeId: ${challengeId}`)
      // Time since is in milliseconds. But total time is in seconds.
      // Hence, converting total time to milliseconds too
      aggregateScore = getRDMScore(testsPassed, totalTests, maxPoints, timeSince, challengeDifficultyTotalTime * 1000)
    }

    aggregateScore = Number(aggregateScore.toFixed(config.SCORE_DECIMALS))

    const reviewSummation = {
      aggregateScore,
      isPassing: true,
      scoreCardId: config.SCORE_CARD_ID,
      submissionId,
      metadata: reviewDetails.metadata || {}
    }

    logger.info(`Save review summation for RDM: ${JSON.stringify(reviewSummation, null, 4)}`)
    await helper.saveSubmissionReviewSummation(submissionId, reviewSummation, token)

    logger.info('The Kafka message is successfully processed.')
    return true
  }

  if (_.includes(tags, config.TAG_EASY)) {
    return calcF2FScore(submission, config.EASY_SCORE_ARRAY, token, reviewDetails)
  } else if (_.includes(tags, config.TAG_MEDIUM)) {
    return calcF2FScore(submission, config.MEDIUM_SCORE_ARRAY, token, reviewDetails)
  } else if (_.includes(tags, config.TAG_HARD)) {
    return calcF2FScore(submission, config.HARD_SCORE_ARRAY, token, reviewDetails)
  }

  if (!reviewDetails.metadata || !reviewDetails.metadata.tests) {
    // throw new Error(`Review for submission with id ${submissionId} does not have metadata. Cannot calculate score without it.`)
    let aggregateScore = 0

    const reviewSummation = {
      aggregateScore,
      isPassing: false,
      scoreCardId: config.SCORE_CARD_ID,
      submissionId,
      metadata: {}
    }

    logger.info(`Save review summation without metadata: ${JSON.stringify(reviewSummation, null, 4)}`)
    await helper.saveSubmissionReviewSummation(submissionId, reviewSummation, token)

    logger.info('The Kafka message is successfully processed.')
    return true
  }

  let tests = reviewDetails.metadata.assertions || reviewDetails.metadata.tests

  let testsPassed = tests.passed ? tests.passed : (tests.total - tests.pending - tests.failed)
  logger.debug(`${submissionId}: testsPassed = ${testsPassed}`)
  // calculate aggregate score
  const ratio = testsPassed / tests.total
  logger.debug(`${submissionId}: ratio = ${ratio}`)
  logger.debug(`${submissionId}: timeSince = ${timeSince}`)
  logger.debug(`${submissionId}: timeLeft = ${timeLeft}`)
  logger.debug(`${submissionId}: totalTime = ${totalTime}`)

  logger.debug(`${submissionId}: submissionCreatedDate = ${submissionCreatedDate} / ${submissionCreatedDate.getTime()}`)
  logger.debug(
    `${submissionId}: submissionPhaseStartedDate = ${submissionPhaseStartedDate} / ${submissionPhaseStartedDate.getTime()}`
  )
  logger.debug(
    `${submissionId}: submissionPhaseEndDate = ${submissionPhaseEndDate} `
  )

  let timeRatio = (timeLeft / totalTime)
  let aggregateScore

  if (ratio > 0) {
    aggregateScore = (ratio * 100) + (timeRatio * config.TIME_WEIGHTAGE)
  } else {
    aggregateScore = 0
  }
  aggregateScore = Math.round(aggregateScore * 1000) / 1000
  logger.debug(`${submissionId}: timeLeft / totalTime = ${(timeLeft / totalTime)}`)
  logger.debug(`${submissionId}: aggregateScore = ${aggregateScore}`)
  // save review summation
  const reviewSummation = {
    aggregateScore,
    isPassing: true,
    scoreCardId: config.SCORE_CARD_ID,
    submissionId,
    metadata: reviewDetails.metadata
  }
  logger.info(`Save review summation using metadata assertions: ${JSON.stringify(reviewSummation, null, 4)}`)
  await helper.saveSubmissionReviewSummation(submissionId, reviewSummation, token)

  logger.info('The Kafka message is successfully processed.')
  return true
}

handle.schema = {
  message: Joi.object().keys({
    topic: Joi.string().required(),
    originator: Joi.string().required(),
    timestamp: Joi.date().required(),
    'mime-type': Joi.string().required(),
    payload: Joi.object().keys({
      resource: Joi.string().required(),
      typeId: Joi.string().required(),
      submissionId: Joi.string().required()
    }).unknown(true).required()
  }).required()
}

// Exports
module.exports = {
  handle
}

logger.buildService(module.exports)

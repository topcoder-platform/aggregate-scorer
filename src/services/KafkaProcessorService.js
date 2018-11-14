/**
 * Kafka processor service.
 */
const Joi = require('joi')
const _ = require('lodash')
const config = require('config')
const uuid = require('uuid/v4')
const logger = require('../common/logger')
const helper = require('../common/helper')

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
  const phases = _.get(challenge, 'result.content.phases', [])
  const submissionPhase = _.find(phases, (phase) => phase.type === config.SUBMISSION_PHASE_TYPE)
  if (!submissionPhase) {
    throw new Error('Failed to find submission phase from challenge details.')
  }
  if (!submissionPhase.actualStartTime) {
    throw new Error('Submission phase has no actual start time.')
  }
  const submissionPhaseStartedDate = new Date(submissionPhase.actualStartTime)
  if (submissionCreatedDate < submissionPhaseStartedDate) {
    throw new Error('Submission created time is earlier than submission phase actual start time.')
  }

  const submissionPhaseEndDate = new Date(_.get(submissionPhase, 'scheduledEndTime'), '')

  const timeSince = submissionCreatedDate.getTime() - submissionPhaseStartedDate.getTime()
  const timeLeft = submissionPhaseEndDate.getTime() - submissionCreatedDate.getTime()
  const totalTime = submissionPhaseEndDate.getTime() - submissionPhaseStartedDate.getTime()
  // get submission review details
  const reviewDetails = await helper.getSubmissionReviewDetails(message.payload.id, token)

  if (!reviewDetails.metadata || !reviewDetails.metadata.tests) {
    // throw new Error(`Review for submission with id ${submissionId} does not have metadata. Cannot calculate score without it.`)
    let aggregateScore = 0

    const reviewSummation = {
      aggregateScore,
      isPassing: false,
      scoreCardId: uuid(),
      submissionId,
      metadata: {}
    }

    logger.info(`Save review summation: ${JSON.stringify(reviewSummation, null, 4)}`)
    await helper.saveSubmissionReviewSummation(submissionId, reviewSummation, token)

    logger.info('The Kafka message is successfully processed.')
    return true
  }

  let tests = reviewDetails.metadata.assertions

  let testsPassed = tests.total - tests.pending - tests.failed
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
    `${submissionId}: submissionPhaseEndDate = ${submissionPhaseEndDate} / ${submissionPhaseEndDate.getTime()}`
  )

  let aggregateScore = (ratio * 100) + ((timeLeft / totalTime) * 100)
  logger.debug(`${submissionId}: aggregateScore = ${aggregateScore}`)
  // aggregateScore won't be negative
  if (aggregateScore > 100) {
    aggregateScore = 100
  }
  // save review summation
  const reviewSummation = {
    aggregateScore,
    isPassing: true,
    scoreCardId: uuid(),
    submissionId,
    metadata: reviewDetails.metadata
  }
  logger.info(`Save review summation: ${JSON.stringify(reviewSummation, null, 4)}`)
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

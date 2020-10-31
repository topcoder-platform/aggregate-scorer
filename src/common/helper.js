/**
 * Contains generic helper methods
 */
const _ = require('lodash')
const config = require('config')
const m2mAuth = require('tc-core-library-js').auth.m2m
const m2m = m2mAuth(_.pick(config, ['AUTH0_URL', 'AUTH0_AUDIENCE', 'TOKEN_CACHE_TIME', 'AUTH0_PROXY_SERVER_URL']))
const axios = require('axios')

/**
 * Function to get axios instance from given TC M2M token
 * @param {String} m2mToken the m2m token to call TC API
 * @returns {Object} new axios instance using given M2M token
 */
function getTCAPIClient (m2mToken) {
  return axios.create({
    headers: {
      Authorization: `Bearer ${m2mToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  })
}

/**
 * Function to get M2M token
 * @returns {String} M2M token
 */
async function getM2Mtoken () {
  return m2m.getMachineToken(config.AUTH0_CLIENT_ID, config.AUTH0_CLIENT_SECRET)
}

/**
 * Function to get submission details
 * @param {String} submissionId the submission id
 * @param {String} m2mToken the m2m token to call TC API
 * @returns {Object} the submission details
 */
async function getSubmissionDetails (submissionId, m2mToken) {
  const url = config.GET_SUBMISSION_DETAILS_URL.replace('{submissionId}', submissionId)
  const result = await getTCAPIClient(m2mToken).get(url)
  return result.data
}

/**
 * Function to get challenge details
 * @param {String|Number} challengeId the challenge id
 * @param {String} m2mToken the m2m token to call TC API
 * @returns {Object} the challenge details
 */
async function getChallengeDetails (challengeId, m2mToken) {
  if (!challengeId) {
    throw new Error('Missing challenge id')
  }
  const url = config.GET_CHALLENGE_DETAILS_URL.replace('{challengeId}', challengeId)
  const result = await getTCAPIClient(m2mToken).get(url)
  if (result.data.length !== 1) {
    throw new Error(`Failed to get challenge details: ${result.data.result.content}`)
  }
  return result.data[0]
}

/**
 * Function to get all challenge submissions
 * @param {String|Number} challengeId the challenge id
 * @param {String} m2mToken the m2m token to call TC API
 * @returns {Object} the challenge submissions
 */
async function getChallengeSubmissions (challengeId, m2mToken) {
  if (!challengeId) {
    throw new Error('Missing challenge id')
  }
  const url = config.GET_CHALLENGE_SUBMISSION_URL.replace('{challengeId}', challengeId)
  const result = await getTCAPIClient(m2mToken).get(url)
  if (result.data.length === 0) {
    throw new Error(`Failed to get challenge details: ${result.data.result.content}`)
  }
  return result.data
}

/**
 * Function to get submission review details
 * @param {String} reviewId the review id
 * @param {String} m2mToken the m2m token to call TC API
 * @returns {Object} the submission review details
 */
async function getSubmissionReviewDetails (reviewId, m2mToken) {
  const url = config.GET_SUBMISSION_REVIEW_DETAILS_URL.replace('{reviewId}', reviewId)
  const result = await getTCAPIClient(m2mToken).get(url)
  return result.data
}

/**
 * Function to save submission review summation
 * @param {String} submissionId the submission id
 * @param {Object} reviewSummation the submission review summation
 * @param {String} m2mToken the m2m token to call TC API
 */
async function saveSubmissionReviewSummation (submissionId, reviewSummation, m2mToken) {
  // get existing review summation
  const client = getTCAPIClient(m2mToken)
  const getUrl = config.GET_REVIEW_SUMMATION_URL.replace('{submissionId}', submissionId)
  const result = await client.get(getUrl)

  if (result.data.length === 0) {
    // create review summation
    await client.post(config.CREATE_REVIEW_SUMMATION_URL, reviewSummation)
  } else {
    // update review summation
    const updateUrl = config.UPDATE_REVIEW_SUMMATION_URL.replace('{reviewSummationId}', result.data[0].id)
    await client.put(updateUrl, reviewSummation)
  }
}

module.exports = {
  getM2Mtoken,
  getSubmissionDetails,
  getChallengeDetails,
  getChallengeSubmissions,
  getSubmissionReviewDetails,
  saveSubmissionReviewSummation
}

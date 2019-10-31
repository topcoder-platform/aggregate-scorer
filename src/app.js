/**
 * The application entry point
 */
require('./bootstrap')
const config = require('config')
const _ = require('lodash')
const logger = require('./common/logger')
const Kafka = require('no-kafka')
const KafkaProcessorService = require('./services/KafkaProcessorService')
const healthcheck = require('topcoder-healthcheck-dropin')

// start Kafka consumer
logger.info('Start Kafka consumer.')
// create consumer
const options = {
  connectionString: config.KAFKA_URL,
  groupId: config.KAFKA_GROUP_ID
}
if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
  options.ssl = {
    cert: config.KAFKA_CLIENT_CERT,
    key: config.KAFKA_CLIENT_CERT_KEY
  }
}
const consumer = new Kafka.GroupConsumer(options)

// data handler
const dataHandler = (messageSet, topic, partition) => Promise.each(messageSet, (m) => {
  const message = m.message.value.toString('utf8')
  logger.info(
    `Handle Kafka event message; Topic: ${topic}; Partition: ${partition}; Offset: ${
      m.offset}; Message: ${message}.`
  )
  let messageJSON
  try {
    messageJSON = JSON.parse(message)
  } catch (e) {
    logger.error('Invalid message JSON.')
    logger.logFullError(e)
    // ignore the message
    return
  }
  if (messageJSON.topic !== topic) {
    logger.error(`The message topic ${messageJSON.topic} doesn't match the Kafka topic ${topic}.`)
    // ignore the message
    return
  }
  // check if the message is of our interest
  // note that when resource and typeId do not match, this is not error, this just indicates
  // the message is not of our interest, the message may be valid for other processors,
  // so it doesn't throw error, but simply returns false to ignore this message
  if (_.get(messageJSON, 'payload.resource', '') !== config.PAYLOAD_RESOURCE ||
    !_.includes(config.PAYLOAD_TYPE_IDS, _.get(messageJSON, 'payload.typeId', ''))) {
    logger.info(
      `Message payload resource or typeId is not matched, the message is ignored: ${_.get(messageJSON, 'payload.resource', '')} / ${_.get(messageJSON, 'payload.typeId', '')}`
    )
    return
  }

  return KafkaProcessorService.handle(messageJSON)
    // commit offset if the message is successfully handled
    .then((handled) => handled && consumer.commitOffset({
      topic, partition, offset: m.offset
    }))
    .catch((err) => logger.logFullError(err))
})

// check if there is kafka connection alive
function check () {
  if (!consumer.client.initialBrokers && !consumer.client.initialBrokers.length) {
    return false
  }
  let connected = true
  consumer.client.initialBrokers.forEach(conn => {
    logger.debug(`url ${conn.server()} - connected=${conn.connected}`)
    connected = conn.connected & connected
  })
  return connected
}

consumer
  .init([{
    subscriptions: config.TOPICS,
    handler: dataHandler
  }])
  // consume configured topics
  .then(() => {
    logger.info('Initialized.......')
    healthcheck.init([check])
    logger.info('Adding topics successfully.......')
    logger.info(config.TOPICS)
    logger.info('Kick Start.......')
  })
  .catch((err) => logger.error(err))

module.exports = {
  kafkaConsumer: consumer
}

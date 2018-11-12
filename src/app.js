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
  connectionString: config.KAFKA_URL
}
if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
  options.ssl = {
    cert: config.KAFKA_CLIENT_CERT,
    key: config.KAFKA_CLIENT_CERT_KEY
  }
}
const consumer = new Kafka.SimpleConsumer(options)

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
    _.get(messageJSON, 'payload.typeId', '') !== config.PAYLOAD_TYPE_ID) {
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
  .init()
  // consume configured topics
  .then(() => {
    healthcheck.init([check])

    _.each(config.TOPICS, (tp) => {
      consumer.subscribe(tp, {
        time: Kafka.LATEST_OFFSET
      }, dataHandler)
    })
  })
  .catch((err) => logger.logFullError(err))

module.exports = {
  kafkaConsumer: consumer
}

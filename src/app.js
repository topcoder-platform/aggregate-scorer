/**
 * The application entry point
 */
require('./bootstrap')
const config = require('config')
const _ = require('lodash')
const logger = require('./common/logger')
const Kafka = require('no-kafka')
const KafkaProcessorService = require('./services/KafkaProcessorService')

// start Kafka consumer
logger.info('Start Kafka consumer.')
// create consumer
const options = { connectionString: config.KAFKA_URL }
if (config.KAFKA_CLIENT_CERT && config.KAFKA_CLIENT_CERT_KEY) {
  options.ssl = { cert: config.KAFKA_CLIENT_CERT, key: config.KAFKA_CLIENT_CERT_KEY }
}
const consumer = new Kafka.SimpleConsumer(options)

// data handler
const dataHandler = (messageSet, topic, partition) => Promise.each(messageSet, (m) => {
  const message = m.message.value.toString('utf8')
  logger.info(`Handle Kafka event message; Topic: ${topic}; Partition: ${partition}; Offset: ${
    m.offset}; Message: ${message}.`)
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
  return KafkaProcessorService.handle(messageJSON)
    // commit offset if the message is successfully handled
    .then((handled) => handled && consumer.commitOffset({ topic, partition, offset: m.offset }))
    .catch((err) => logger.logFullError(err))
})

consumer
  .init()
  // consume configured topics
  .then(() => _.each(config.TOPICS, (tp) => {
    consumer.subscribe(tp, { time: Kafka.LATEST_OFFSET }, dataHandler)
  }))
  .catch((err) => logger.logFullError(err))

module.exports = {
  kafkaConsumer: consumer
}

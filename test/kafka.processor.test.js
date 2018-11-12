/**
 * The test cases for Kafka processor.
 */
const expect = require('chai').expect
// this will start the Kafka consumer
const consumer = require('../src/app').kafkaConsumer
const testHelper = require('./testHelper')
const service = require('../src/services/KafkaProcessorService')

describe('Kafka Processor Tests', () => {
  let testMessage

  before(async () => {
    // wait for app setup
    await testHelper.wait()
  })

  after(async () => {
    await consumer.end()
    const stop = async () => {
      // wait for all tests' completion, then stop the process explicitly,
      // because the Kafka consumer will make the process non-stop
      await testHelper.wait()
      process.exit(0)
    }
    // exiting process is done in another async function without awaiting so that
    // it can return to mocka to let it do some clean up before existing the process
    stop()
  })

  beforeEach(async () => {
    testMessage = {
      topic: 'submission.notification.update',
      originator: 'submission-api',
      timestamp: '2018-01-02T00:00:00',
      'mime-type': 'application/json',
      payload: {
        resource: 'review',
        id: 'd34d4180-65aa-42ec-a945-5fd21dec0502',
        score: 92,
        typeId: 'c56a4180-65aa-42ec-a945-5fd21dec0501',
        reviewerId: 'c23a4180-65aa-42ec-a945-5fd21dec0503',
        scoreCardId: 'b25a4180-65aa-42ec-a945-5fd21dec0503',
        submissionId: '8f36dfa2-6ff2-463e-88e3-71e1ce6538e6',
        created: '2018-05-20T07:00:30.123Z',
        updated: '2018-06-01T07:36:28.178Z',
        createdBy: 'admin',
        updatedBy: 'admin'
      }
    }
  })

  it('KafkaProcessorService - null message', async () => {
    try {
      await service.handle(null)
    } catch (e) {
      expect(e.isJoi).to.equal(true)
      return
    }
    throw new Error('should throw error for null message')
  })

  it('KafkaProcessorService - invalid message (missing topic)', async () => {
    delete testMessage.topic
    try {
      await service.handle(testMessage)
    } catch (e) {
      expect(e.isJoi).to.equal(true)
      return
    }
    throw new Error('should throw error for invalid message (missing topic)')
  })

  it('KafkaProcessorService - invalid message (empty topic)', async () => {
    testMessage.topic = ''
    try {
      await service.handle(testMessage)
    } catch (e) {
      expect(e.isJoi).to.equal(true)
      return
    }
    throw new Error('should throw error for invalid message (empty topic)')
  })

  it('KafkaProcessorService - invalid message (missing originator)', async () => {
    delete testMessage.originator
    try {
      await service.handle(testMessage)
    } catch (e) {
      expect(e.isJoi).to.equal(true)
      return
    }
    throw new Error('should throw error for invalid message (missing originator)')
  })

  it('KafkaProcessorService - invalid message (invalid originator)', async () => {
    testMessage.originator = 123
    try {
      await service.handle(testMessage)
    } catch (e) {
      expect(e.isJoi).to.equal(true)
      return
    }
    throw new Error('should throw error for invalid message (invalid originator)')
  })

  it('KafkaProcessorService - invalid message (missing timestamp)', async () => {
    delete testMessage.timestamp
    try {
      await service.handle(testMessage)
    } catch (e) {
      expect(e.isJoi).to.equal(true)
      return
    }
    throw new Error('should throw error for invalid message (missing timestamp)')
  })

  it('KafkaProcessorService - invalid message (invalid timestamp)', async () => {
    testMessage.timestamp = 'abc'
    try {
      await service.handle(testMessage)
    } catch (e) {
      expect(e.isJoi).to.equal(true)
      return
    }
    throw new Error('should throw error for invalid message (invalid timestamp)')
  })

  it('KafkaProcessorService - invalid message (missing mime-type)', async () => {
    testMessage['mime-type'] = null
    try {
      await service.handle(testMessage)
    } catch (e) {
      expect(e.isJoi).to.equal(true)
      return
    }
    throw new Error('should throw error for invalid message (missing mime-type)')
  })

  it('KafkaProcessorService - invalid message (invalid mime-type)', async () => {
    testMessage['mime-type'] = {}
    try {
      await service.handle(testMessage)
    } catch (e) {
      expect(e.isJoi).to.equal(true)
      return
    }
    throw new Error('should throw error for invalid message (invalid mime-type)')
  })

  it('KafkaProcessorService - invalid message (null payload)', async () => {
    testMessage.payload = null
    try {
      await service.handle(testMessage)
    } catch (e) {
      expect(e.isJoi).to.equal(true)
      return
    }
    throw new Error('should throw error for invalid message (null payload)')
  })

  it('KafkaProcessorService - invalid message (invalid payload)', async () => {
    testMessage.payload = [{ abc: 123 }]
    try {
      await service.handle(testMessage)
    } catch (e) {
      expect(e.isJoi).to.equal(true)
      return
    }
    throw new Error('should throw error for invalid message (invalid payload)')
  })

  it('KafkaProcessorService - invalid message (missing payload resource)', async () => {
    testMessage.payload.resource = null
    try {
      await service.handle(testMessage)
    } catch (e) {
      expect(e.isJoi).to.equal(true)
      return
    }
    throw new Error('should throw error for invalid message (missing payload resource)')
  })

  it('KafkaProcessorService - invalid message (invalid payload resource)', async () => {
    testMessage.payload.resource = { other: 'invalid' }
    try {
      await service.handle(testMessage)
    } catch (e) {
      expect(e.isJoi).to.equal(true)
      return
    }
    throw new Error('should throw error for invalid message (invalid payload resource)')
  })

  it('KafkaProcessorService - invalid message (missing payload typeId)', async () => {
    testMessage.payload.typeId = null
    try {
      await service.handle(testMessage)
    } catch (e) {
      expect(e.isJoi).to.equal(true)
      return
    }
    throw new Error('should throw error for invalid message (missing payload typeId)')
  })

  it('KafkaProcessorService - invalid message (empty payload typeId)', async () => {
    testMessage.payload.typeId = ''
    try {
      await service.handle(testMessage)
    } catch (e) {
      expect(e.isJoi).to.equal(true)
      return
    }
    throw new Error('should throw error for invalid message (empty payload typeId)')
  })

  it('KafkaProcessorService - handle message successfully', async () => {
    const result = await service.handle(testMessage)
    expect(result).to.equal(true)
  })

  it('KafkaProcessorService - handle unmatched message properly (resource doesn\'t match)', async () => {
    testMessage.payload.resource = 'other'
    const result = await service.handle(testMessage)
    expect(result).to.equal(false)
  })

  it('KafkaProcessorService - handle unmatched message properly (typeId doesn\'t match)', async () => {
    testMessage.payload.typeId = 'other'
    const result = await service.handle(testMessage)
    expect(result).to.equal(false)
  })
})

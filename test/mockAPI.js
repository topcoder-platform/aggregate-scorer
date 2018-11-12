/**
 * The application entry point for mock API
 */
const express = require('express')
const cors = require('cors')
const logger = require('../src/common/logger')
const config = require('./mockAPIConfig')

const app = express()
app.set('port', config.MOCK_API_PORT)

app.use(cors())

app.get('/submission-review-details/:submissionId', (req, res) => {
  logger.info(`Mock API get submission review details of submission id: ${req.params.submissionId}`)
  res.json({ score: 80, totalTests: 100, testsPassed: 80 })
})

app.use((req, res) => {
  res.status(404).json({ error: 'route not found' })
})

app.use((err, req, res, next) => {
  logger.logFullError(err)
  res.status(500).json({
    error: err.message
  })
})

app.listen(app.get('port'), '0.0.0.0', () => {
  logger.info(`Express server listening on port ${app.get('port')}`)
})

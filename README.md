# Topcoder Event Leaderboards: Leaderboard Aggregate Scorer

## Dependencies

- nodejs https://nodejs.org/en/ (v10)
- Kafka (v2)

## Configuration

Configuration for the notification server is at `config/default.js`.
The following parameters can be set in config file or in env variables:

- DISABLE_LOGGING: whether to disable logging
- LOG_LEVEL: the log level
- KAFKA_URL: comma separated Kafka hosts
- KAFKA_CLIENT_CERT: Kafka connection certificate, optional;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to certificate file or certificate content
- KAFKA_CLIENT_CERT_KEY: Kafka connection private key, optional;
    if not provided, then SSL connection is not used, direct insecure connection is used;
    if provided, it can be either path to private key file or private key content
- KAFKA_GROUP_ID: the Kafka group id
- TOPICS: Kafka topics to listen to
- AUTH0_URL: Auth0 URL, used to get TC M2M token
- AUTH0_AUDIENCE: Auth0 audience, used to get TC M2M token
- TOKEN_CACHE_TIME: token cache time, used to get TC M2M token
- AUTH0_CLIENT_ID: Auth0 client id, used to get TC M2M token
- AUTH0_CLIENT_SECRET: Auth0 client secret, used to get TC M2M token
- PAYLOAD_RESOURCE: the Kafka message payload resource to match message to process
- PAYLOAD_TYPE_IDS: the Kafka message payload type ids to match message to process
- SUBMISSION_PHASE_TYPE: the challenge submission phase type name
- GET_SUBMISSION_DETAILS_URL: URL to get submission details
- GET_CHALLENGE_DETAILS_URL: URL to get challenge details
- GET_SUBMISSION_REVIEW_DETAILS_URL: URL to get submission review details
- GET_CHALLENGE_SUBMISSION_URL: URL to get all submissions of challenge
- GET_REVIEW_SUMMATION_URL: URL to get submission review summation
- CREATE_REVIEW_SUMMATION_URL: URL to create submission review summation
- UPDATE_REVIEW_SUMMATION_URL: URL to update submission review summation
- RDM_TAGS: rdm tags
- RDM_CHALLENGE_INFO: rdm challenge info
- SCORE_CARD_ID: score card id
- SCORE_DECIMALS: up to how many decimals the score is set to


Test config is at `test/testConfig.js`, you don't need to change it.
The following test parameters can be set in test config file or in env variables:

- WAIT_MS: the time in milliseconds to wait for some processing completion


Mock API config is at `test/mockAPIConfig.js`, you don't need to change it.
The following parameters can be set in mock config file or in env variables:

- MOCK_API_PORT: the mock API port, default value is 4000


Set the following environment variables so that the app can get TC M2M token (use 'set' insted of 'export' for Windows OS):
- export AUTH0_CLIENT_ID=7XA6a0odabrNOXJykRFbOYvK0mSJHX7N
- export AUTH0_CLIENT_SECRET=goLR4PuIP9FhF8nPWRSm3K6KDZ70WqD7ce6h-ptyWgUqaeSq9YFbtfrhKyOwIkw7
- export AUTH0_URL=https://topcoder-dev.auth0.com/oauth/token
- export AUTH0_AUDIENCE=https://m2m.topcoder-dev.com/


## Local Kafka setup

- `http://kafka.apache.org/quickstart` contains details to setup and manage Kafka server,
  below provides details to setup Kafka server in Mac, Windows will use bat commands in bin/windows instead
- download kafka at `http://kafka.apache.org/downloads`
- extract out the doanlowded file
- go to extracted directory
- start ZooKeeper server:
  `bin/zookeeper-server-start.sh config/zookeeper.properties`
- use another terminal, go to same directory, start the Kafka server:
  `bin/kafka-server-start.sh config/server.properties`
- note that the zookeeper server is at localhost:2181, and Kafka server is at localhost:9092
- use another terminal, go to same directory, create some topics:
  `bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic submission.notification.create`
  `bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic submission.notification.update`
- verify that the topics are created:
  `bin/kafka-topics.sh --list --zookeeper localhost:2181`,
  it should list out the created topics

## Local deployment

- setup Kafka as above
- install dependencies `npm i`
- run code lint check `npm run lint`
- run code lint fix `npm run lint:fix`
- start mock API to get submission review details `npm run mock`,
  the mock API is running at `http://localhost:4000`
- run tests `npm run test`
- run tests with coverage `npm run cov`
- start app `npm start`, it starts Kafka consumer to listen to configured topics


## Heroku Deployment

- git init
- git add .
- git commit -m init
- heroku create
- heroku config:set KAFKA_URL=... TOPICS=topic1,topic2
- git push heroku master


## Verification

- setup Kafka as above
- start mock API
- start app

- go to the Kafka folder, run Kafka producer for topic `submission.notification.create`:
  `bin/kafka-console-producer.sh --broker-list localhost:9092 --topic submission.notification.create`

- input valid message to producer (one message per line):
  `{ "topic": "submission.notification.create", "originator": "submission-api", "timestamp": "2018-02-16T00:00:00", "mime-type": "application/json", "payload": { "resource": "review", "id": "d34d4180-65aa-42ec-a945-5fd21dec0502", "score": 92, "typeId": "c56a4180-65aa-42ec-a945-5fd21dec0501", "reviewerId": "c23a4180-65aa-42ec-a945-5fd21dec0503", "scoreCardId": "b25a4180-65aa-42ec-a945-5fd21dec0503", "submissionId": "8f36dfa2-6ff2-463e-88e3-71e1ce6538e6", "created": "2018-05-20T07:00:30.123Z", "updated": "2018-06-01T07:36:28.178Z", "createdBy": "admin", "updatedBy": "admin" } }`
- watch the app console output, below is shown:
```
info: Save review summation: {
    "aggregateScore": 100,
    "isPassing": true,
    "scoreCardId": "60f49f66-3539-42ee-94db-474a55203e26",
    "submissionId": "8f36dfa2-6ff2-463e-88e3-71e1ce6538e6"
}
info: The Kafka message is successfully processed.
```

- input unmatched messages to producer (one message per line):
  `{ "topic": "submission.notification.create", "originator": "submission-api", "timestamp": "2018-02-16T00:00:00", "mime-type": "application/json", "payload": { "resource": "other", "id": "d34d4180-65aa-42ec-a945-5fd21dec0502", "score": 92, "typeId": "c56a4180-65aa-42ec-a945-5fd21dec0501", "reviewerId": "c23a4180-65aa-42ec-a945-5fd21dec0503", "scoreCardId": "b25a4180-65aa-42ec-a945-5fd21dec0503", "submissionId": "8f36dfa2-6ff2-463e-88e3-71e1ce6538e6", "created": "2018-05-20T07:00:30.123Z", "updated": "2018-06-01T07:36:28.178Z", "createdBy": "admin", "updatedBy": "admin" } }`
  `{ "topic": "submission.notification.create", "originator": "submission-api", "timestamp": "2018-02-16T00:00:00", "mime-type": "application/json", "payload": { "resource": "review", "id": "d34d4180-65aa-42ec-a945-5fd21dec0502", "score": 92, "typeId": "other", "reviewerId": "c23a4180-65aa-42ec-a945-5fd21dec0503", "scoreCardId": "b25a4180-65aa-42ec-a945-5fd21dec0503", "submissionId": "8f36dfa2-6ff2-463e-88e3-71e1ce6538e6", "created": "2018-05-20T07:00:30.123Z", "updated": "2018-06-01T07:36:28.178Z", "createdBy": "admin", "updatedBy": "admin" } }`
- watch the app console output, below is shown:
```
info: Message payload resource or typeId is not matched, the message is ignored.
```

- in the Kafka producer, write some invalid messages (one message per line):
  `invalid message [{`
  `{ "topic": "submission.notification.update", "originator": "test-originator", "timestamp": "abc", "mime-type": "application/json", "payload": { "key1": "value1" } }`
  `{ "topic": "submission.notification.create", "originator": "test-originator", "timestamp": "2018-02-16T00:00:00", "mime-type": "application/json" }`
- watch the app console output, errors details are shown

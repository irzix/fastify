'use strict'

const { test } = require('node:test')
const Fastify = require('../..')

test('trailer handler should prevent multiple callback calls', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify()

  fastify.get('/', function (request, reply) {
    reply.trailer('Test-Trailer', function (reply, payload, done) {
      // Call callback synchronously
      done(null, 'first-call')
      // Also return a promise (mixing callback and promise)
      return Promise.resolve('second-call')
    })
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    // Should only use first callback value, not the promise
    t.assert.strictEqual(res.trailers['test-trailer'], 'first-call')
    testDone()
  })
})

test('trailer handler should warn on multiple callback calls', (t, testDone) => {
  t.plan(4)
  const fastify = Fastify()
  let warnCalled = false

  fastify.get('/', function (request, reply) {
    const originalWarn = reply.log.warn
    reply.log.warn = function (obj, msg) {
      if (msg && msg.includes('called callback multiple times')) {
        warnCalled = true
      }
      originalWarn.call(this, obj, msg)
    }

    reply.trailer('Test-Trailer', function (reply, payload, done) {
      done(null, 'first')
      // Call callback again (should be ignored)
      done(null, 'second')
    })
    reply.send({ hello: 'world' })
  })

  fastify.inject({
    method: 'GET',
    url: '/'
  }, (error, res) => {
    t.assert.ifError(error)
    t.assert.strictEqual(res.statusCode, 200)
    t.assert.strictEqual(res.trailers['test-trailer'], 'first')
    t.assert.ok(warnCalled, 'Warning should be logged for multiple callbacks')
    testDone()
  })
})

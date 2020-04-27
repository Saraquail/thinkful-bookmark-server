const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray } = require('./bookmarks-fixtures'
)

describe('Bookmarks Endpoints', () => {
  let db = 'db'

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL
    })
    app.set('db', db) 
  })

  after('disconnect from db', () => db.destroy())

  before('clean the table', () => db('bookmarks').truncate())

  afterEach('cleanup', () => db('bookmarks').truncate())

  describe('GET bookmarks endpoint', () => {

    context('If there are no bookmarks', () => {
      it('responds with 200 and an empty array', () => {
        return supertest(app)
          .get('/api/bookmarks')
          .expect(200, [])
      })
    })

    context('If there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('response with 200 and all of the bookmarks in the db', () => {
        return supertest(app)
          .get('/api/bookmarks')
          .expect(200, testBookmarks)
      })
    })
  })

  describe('GET /api/bookmarks/:id endpoint', () => {
    
    context('If there are no data', () => {

      it('responds with 404', () => {
        const bookmarkId = 982704
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .expect(404, 
            { error: { message: 'Bookmark does not exist' } })
      })
    })

    context('If there are data', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 200 and the specified bookmark', () => {
        const bookmarkId = 2
        const expectedBookmark = testBookmarks[bookmarkId - 1]
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .expect(200, expectedBookmark)
      })
    })

    context('Given an XSS attack', () => {
 
      const maliciousInput = {
        id: 911,
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        url: "https://url.to.file.which/does-not.exist",
        description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
        rating: 1
      }

      beforeEach('insert malicious bookmark', () => {
        return db
          .into('bookmarks')
          .insert(([maliciousInput]))
      })

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/bookmarks/${maliciousInput.id}`)
          .expect(200)
          .expect(res => {
              expect(res.body.title).to.eql('Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;')
              expect(res.body.description).to.eql(`Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`)
          })
      })
    })
  })
  
  describe('POST /api/bookmarks endpoint', () => {

    it('creates a bookmark and responds with 201 and the new bookmark', () => {
      const newBookmark = {
        title: 'Test',
        url: 'https://www.test.com',
        description: 'test',
        rating: 3
      }

      return supertest(app)
        .post('/api/bookmarks')
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title)
          expect(res.body.url).to.eql(newBookmark.url)
          expect(res.body.description).to.eql(newBookmark.description)
          expect(res.body.rating).to.eql(newBookmark.rating)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
        })
        .then(postRes => 
          supertest(app)
          .get(`/api/bookmarks/${postRes.body.id}`)
          .expect(postRes.body)
          )
    })


    it('responds with 400 and error message if rating is invalid', () => {
      const newBookmark = {
        title: 'Test',
        url: 'https://www.test.com',
        description: 'test',
        rating: 6
      }
      return supertest(app)
        .post('/api/bookmarks')
        .send(newBookmark)
        .expect(400, {
          error: { message: 'rating must be a number 1-5'}
        })
    })

    const requiredFields = ['title', 'url', 'rating']

    requiredFields.forEach(field => {
      const newBookmark = {
        title: 'Test',
        url: 'https://www.test.com',
        rating: 3
      }

      it('responds with 400 and error message if a field is missing', () => {
        delete newBookmark[field]

        return supertest(app)
          .post('/api/bookmarks')
          .send(newBookmark)
          .expect(400, {
            error: { message: 'title, url, and rating are required'}
          })
      })
    })
  })

  describe('DELETE bookmarks endpoint', () => {

    context('If there are no data', () => {
      it('responds with 404', () => {
        const bookmarkId = 239140

        return supertest(app)
          .delete(`/api/bookmarks/${bookmarkId}`)
          .expect(404, { error: { message: 'Bookmark does not exist' } })
      })
    })
    context('If there are data', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 204 and removes bookmark', () => {
        const idToRemove = 2
        const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToRemove)

        return supertest(app)
          .delete(`/api/bookmarks/${idToRemove}`)
          .expect(204)
          .then(res => 
            supertest(app)
              .get('/api/bookmarks')
              .expect(expectedBookmarks)
          )
      })
    })
  })

  describe('PATCH /api/bookmarks/:id endpoint', () => {

    context('If there are no data', () => {
      it('responds with 404', () => {
        const bookmarkId = 32420

        return supertest(app)
          .patch(`/api/bookmarks/${bookmarkId}`)
          .expect(404, {
            error: { message: 'Bookmark does not exist'}
          })
      }) 
    })

    context('If there are data', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 400 when no required fields are supplied', () => {
        const idToUpdate = 2

        return supertest(app)
        .patch(`/api/bookmarks/${idToUpdate}`)
        .send({ garbage: 'should trigger error'})
        .expect(400, {
          error: { message: 'Must contain either title, url, description, or rating' }
        }) 
      })

      it('responds with 204 when updating only a subset of fields', () => {
        const idToUpdate = 2
        const updateBookmark = {
          title: 'updated title'
        }

        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark
        }

        return supertest(app)
        .patch(`/api/bookmarks/${idToUpdate}`)
        .send({
          ...updateBookmark,
          fieldToIgnore: 'should be ignored'
        })
        .expect(204)
        .then(res => 
          supertest(app)
            .get(`/api/bookmarks/${idToUpdate}`)
            .expect(expectedBookmark)
          )
      })

      it('responds with 204 and updates the bookmark', () => {
        const idToUpdate = 2 
        const updateBookmark = {
          title: 'updated title',
          url: 'https://www.stuff.com',
          description: 'it do',
          rating: 3
        }

        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark
        }

        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .send(updateBookmark)
          .expect(204)
          .then(res => 
            supertest(app)
            .get(`/api/bookmarks/${idToUpdate}`)
            .expect(expectedBookmark)
          )
      })
    })
  })
}) 

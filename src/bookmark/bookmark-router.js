const express = require('express')
const xss = require('xss')
const logger = require('../logger')
const BookmarkService = require('./bookmark-service')

const bookmarkRouter = express.Router()
const parser = express.json()
// GET /bookmarks that returns a list of bookmarks

bookmarkRouter
  .route('/')

  .get((req, res, next) => {
    BookmarkService.getAllBookmarks(
      req.app.get('db')
    )
      .then(bookmarks => {
        res.json(bookmarks)
      })
      .catch(next)
  })
// POST /bookmarks that accepts a JSON object representing a bookmark and adds it to the list of bookmarks after validation
  .post(parser, (req, res, next) => {
      const {title, url, description, rating} = req.body
      const newBookmark = {title, url, description, rating}

      if (newBookmark.title == null || newBookmark.url == null || newBookmark.rating == null) {
        return res.status(400).json({
          error: { message: 'title, url, and rating are required' } })
      }

      if(newBookmark.rating < 1 || newBookmark.rating > 5){
        return res.status(400).json({
          error: {
            message: 'rating must be a number 1-5'
          }
        })
      }

      logger.info('Bookmark with id ${bookmark.id} created.')

      BookmarkService.insertBookmark(
        req.app.get('db'),
        newBookmark
      )
        .then(bookmark => {
          res
          .status(201)
          .location(`/api/bookmarks/${bookmark.id}`)
          .json(bookmark);
        })
        .catch(next)
//use this if all keys are required
        // for (const [key, value] of Object.entries(newArticle)) {
        //   if (value == null) {
        //     return res.status(400).json({
        //       error: { message: `Missing '${key}' in request body` }
        //     })
        //   }
        // }
  })

// GET /bookmarks/:id that returns a single bookmark with the given ID, return 404 Not Found if the ID is not valid

bookmarkRouter
  .route('/:id')
  .all((req, res, next) => {
    BookmarkService.getById(
      req.app.get('db'),
      req.params.id
    )
      .then(bookmark => {
        if(!bookmark) {
          return res
            .status(404)
            .json({
              error: { message: 'Bookmark does not exist'}
            })
        }
        res.bookmark = bookmark
        next()
      })
      .catch(next)
  })

  .get((req, res) => {
    
    res.json({
      id: res.bookmark.id,
      title: xss(res.bookmark.title),
      url: xss(res.bookmark.url),
      description: xss(res.bookmark.description),
      rating: res.bookmark.rating
    })
  })
// DELETE /bookmarks/:id that deletes the bookmark with the given ID.
  .delete((req, res, next) => {

    BookmarkService.deleteBookmark(
      req.app.get('db'),
      req.params.id
    )
      .then(() => {
        logger.info(`Bookmark with id ${req.params.id} deleted`)

        res.status(204).end()
      })
      .catch(next)
  })

  .patch(parser, (req, res, next) => {
    const {title, url, description, rating} = req.body
    const bookmarkToUpdate = {title, url, description, rating} 
  
    const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean).length

    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: 'Must contain either title, url, description, or rating'
        }
      })
    }

    BookmarkService.updateBookmark(
      req.app.get('db'),
      req.params.id,
      bookmarkToUpdate
    )
      .then(rows => {
        res.status(204).end()
      })
      .catch(next)
  })

  module.exports = bookmarkRouter
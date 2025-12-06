/**
 * Content Routes
 * Serves blog posts, homepage, and policy pages
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const posts = require('../data/posts');

/**
 * GET / - Homepage with all posts
 */
router.get('/', (req, res) => {
  logger.info('Serving homepage');
  res.render('home', {
    title: 'Dating & Relationship Tips | atolf.xyz'
  });
});

/**
 * GET /post/:slug - Individual blog post
 */
router.get('/post/:slug', (req, res) => {
  const slug = req.params.slug;
  const post = posts[slug];
  
  if (!post) {
    logger.warn('Post not found', { slug });
    return res.status(404).render('error', {
      title: 'Post Not Found',
      message: 'Sorry, this post does not exist.',
      code: 404
    });
  }
  
  logger.info('Serving post', { slug });
  res.render('post', {
    title: post.title.en + ' | atolf.xyz',
    post: post
  });
});

/**
 * GET /about - About page
 */
router.get('/about', (req, res) => {
  logger.info('Serving about page');
  res.render('about', {
    title: 'About Us | atolf.xyz'
  });
});

/**
 * GET /contact - Contact page
 */
router.get('/contact', (req, res) => {
  logger.info('Serving contact page');
  res.render('contact', {
    title: 'Contact Us | atolf.xyz'
  });
});

/**
 * GET /privacy - Privacy policy page
 */
router.get('/privacy', (req, res) => {
  logger.info('Serving privacy page');
  res.render('privacy', {
    title: 'Privacy Policy | atolf.xyz'
  });
});

/**
 * POST /contact - Handle contact form submission
 */
router.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  logger.info('Contact form submission', { name, email, subject });
  // For now, just redirect back with success
  // In production, you'd send email or store in database
  res.redirect('/contact?success=true');
});

module.exports = router;

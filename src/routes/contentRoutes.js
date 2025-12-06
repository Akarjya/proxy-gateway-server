/**
 * Content Routes
 * Serves blog posts, homepage, and policy pages
 * 
 * IMPORTANT: All routes here require an active proxy session
 * Users without a session will be redirected to /loader
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const posts = require('../data/posts');
const { requireProxySession } = require('../middleware/proxySessionMiddleware');

/**
 * Apply proxy session middleware to ALL content routes
 * This ensures no one can access content without going through loader
 * which activates the Service Worker for proxy protection
 */
router.use(requireProxySession({
  excludePaths: [] // No exclusions - all content routes require session
}));

/**
 * GET / - Homepage with all posts
 */
router.get('/', (req, res) => {
  logger.info('Serving homepage', {
    proxySessionId: req.session.proxySessionId
  });
  res.render('home', {
    title: 'Dating & Relationship Tips | atolf.xyz',
    posts: posts
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
  
  logger.info('Serving post', { 
    slug,
    proxySessionId: req.session.proxySessionId 
  });
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

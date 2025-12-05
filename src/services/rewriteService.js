/**
 * URL Rewrite Service
 * Rewrites all URLs in HTML content to go through the proxy gateway
 */

const cheerio = require('cheerio');
const config = require('../config/config');
const logger = require('../utils/logger');

class RewriteService {
  /**
   * Rewrite all URLs in HTML content
   * @param {string|Buffer} html - HTML content to rewrite
   * @param {string} baseUrl - Base URL of the target site
   * @returns {string} Rewritten HTML
   */
  rewriteHtml(html, baseUrl) {
    // Convert buffer to string if needed
    const htmlString = Buffer.isBuffer(html) ? html.toString('utf-8') : html;
    
    const $ = cheerio.load(htmlString, {
      decodeEntities: false
    });

    const targetDomain = new URL(baseUrl).origin;

    // Rewrite anchor tags (links)
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      const newHref = this.rewriteUrl(href, targetDomain);
      if (newHref) {
        $(element).attr('href', newHref);
      }
    });

    // Rewrite image sources
    $('img[src]').each((_, element) => {
      const src = $(element).attr('src');
      const newSrc = this.rewriteUrl(src, targetDomain);
      if (newSrc) {
        $(element).attr('src', newSrc);
      }
    });

    // Rewrite srcset for responsive images
    $('img[srcset], source[srcset]').each((_, element) => {
      const srcset = $(element).attr('srcset');
      const newSrcset = this.rewriteSrcset(srcset, targetDomain);
      if (newSrcset) {
        $(element).attr('srcset', newSrcset);
      }
    });

    // Rewrite lazy-loaded images (data-src, data-srcset, data-lazy-src, etc.)
    $('img[data-src], [data-src]').each((_, element) => {
      const dataSrc = $(element).attr('data-src');
      const newDataSrc = this.rewriteUrl(dataSrc, targetDomain);
      if (newDataSrc) {
        $(element).attr('data-src', newDataSrc);
      }
    });

    $('img[data-srcset], [data-srcset]').each((_, element) => {
      const dataSrcset = $(element).attr('data-srcset');
      const newDataSrcset = this.rewriteSrcset(dataSrcset, targetDomain);
      if (newDataSrcset) {
        $(element).attr('data-srcset', newDataSrcset);
      }
    });

    $('[data-lazy-src]').each((_, element) => {
      const lazySrc = $(element).attr('data-lazy-src');
      const newLazySrc = this.rewriteUrl(lazySrc, targetDomain);
      if (newLazySrc) {
        $(element).attr('data-lazy-src', newLazySrc);
      }
    });

    $('[data-lazy-srcset]').each((_, element) => {
      const lazySrcset = $(element).attr('data-lazy-srcset');
      const newLazySrcset = this.rewriteSrcset(lazySrcset, targetDomain);
      if (newLazySrcset) {
        $(element).attr('data-lazy-srcset', newLazySrcset);
      }
    });

    // Rewrite background images in data attributes
    $('[data-bg], [data-background]').each((_, element) => {
      const dataBg = $(element).attr('data-bg') || $(element).attr('data-background');
      const attrName = $(element).attr('data-bg') ? 'data-bg' : 'data-background';
      const newDataBg = this.rewriteUrl(dataBg, targetDomain);
      if (newDataBg) {
        $(element).attr(attrName, newDataBg);
      }
    });

    // Rewrite stylesheets
    $('link[href]').each((_, element) => {
      const href = $(element).attr('href');
      const newHref = this.rewriteUrl(href, targetDomain);
      if (newHref) {
        $(element).attr('href', newHref);
      }
    });

    // Rewrite scripts
    $('script[src]').each((_, element) => {
      const src = $(element).attr('src');
      const newSrc = this.rewriteUrl(src, targetDomain);
      if (newSrc) {
        $(element).attr('src', newSrc);
      }
    });

    // Rewrite form actions
    $('form[action]').each((_, element) => {
      const action = $(element).attr('action');
      const newAction = this.rewriteUrl(action, targetDomain);
      if (newAction) {
        $(element).attr('action', newAction);
      }
    });

    // Rewrite video/audio sources
    $('video[src], audio[src], source[src]').each((_, element) => {
      const src = $(element).attr('src');
      const newSrc = this.rewriteUrl(src, targetDomain);
      if (newSrc) {
        $(element).attr('src', newSrc);
      }
    });

    // Rewrite video poster
    $('video[poster]').each((_, element) => {
      const poster = $(element).attr('poster');
      const newPoster = this.rewriteUrl(poster, targetDomain);
      if (newPoster) {
        $(element).attr('poster', newPoster);
      }
    });

    // Rewrite object/embed
    $('object[data], embed[src]').each((_, element) => {
      const attr = $(element).attr('data') || $(element).attr('src');
      const newAttr = this.rewriteUrl(attr, targetDomain);
      if (newAttr) {
        if ($(element).attr('data')) {
          $(element).attr('data', newAttr);
        } else {
          $(element).attr('src', newAttr);
        }
      }
    });

    // Rewrite iframe sources (important for proxying external content)
    $('iframe[src]').each((_, element) => {
      const src = $(element).attr('src');
      const newSrc = this.rewriteUrl(src, targetDomain);
      if (newSrc) {
        $(element).attr('src', newSrc);
      }
    });

    // Rewrite inline styles with url()
    $('[style]').each((_, element) => {
      const style = $(element).attr('style');
      const newStyle = this.rewriteInlineStyle(style, targetDomain);
      if (newStyle !== style) {
        $(element).attr('style', newStyle);
      }
    });

    // Rewrite meta refresh redirects
    $('meta[http-equiv="refresh"]').each((_, element) => {
      const content = $(element).attr('content');
      const newContent = this.rewriteMetaRefresh(content, targetDomain);
      if (newContent) {
        $(element).attr('content', newContent);
      }
    });

    return $.html();
  }

  /**
   * Rewrite a single URL
   * @param {string} url - Original URL
   * @param {string} targetDomain - Target domain origin
   * @returns {string|null} Rewritten URL or null if should not be rewritten
   */
  rewriteUrl(url, targetDomain) {
    if (!url) return null;

    // Skip data URIs, javascript:, mailto:, tel:, #anchors
    if (url.startsWith('data:') || 
        url.startsWith('javascript:') || 
        url.startsWith('mailto:') || 
        url.startsWith('tel:') ||
        url.startsWith('#')) {
      return null;
    }

    // Skip if already rewritten
    if (url.startsWith('/browse') || url.startsWith('/external')) {
      return null;
    }

    let absoluteUrl;

    // Handle different URL formats
    if (url.startsWith('//')) {
      // Protocol-relative URL
      absoluteUrl = 'https:' + url;
    } else if (url.startsWith('/')) {
      // Absolute path
      absoluteUrl = targetDomain + url;
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      // Already absolute
      absoluteUrl = url;
    } else {
      // Relative path - make it absolute
      absoluteUrl = targetDomain + '/' + url;
    }

    // Check if URL belongs to target domain or should be proxied
    try {
      const urlObj = new URL(absoluteUrl);
      const targetObj = new URL(targetDomain);

      // Only rewrite URLs from the same domain
      if (urlObj.hostname === targetObj.hostname) {
        return '/browse' + urlObj.pathname + urlObj.search + urlObj.hash;
      }

      // For external resources (CDNs, etc.), also proxy them
      // This ensures all requests go through our proxy
      return '/external/' + encodeURIComponent(absoluteUrl);

    } catch (error) {
      logger.warn('Failed to parse URL', { url, error: error.message });
      return null;
    }
  }

  /**
   * Rewrite srcset attribute
   * @param {string} srcset - Original srcset
   * @param {string} targetDomain - Target domain
   * @returns {string} Rewritten srcset
   */
  rewriteSrcset(srcset, targetDomain) {
    if (!srcset) return null;

    return srcset.split(',').map(part => {
      const trimmed = part.trim();
      const [url, descriptor] = trimmed.split(/\s+/);
      const newUrl = this.rewriteUrl(url, targetDomain);
      return newUrl ? `${newUrl} ${descriptor || ''}`.trim() : trimmed;
    }).join(', ');
  }

  /**
   * Rewrite inline style url() references
   * @param {string} style - Inline style string
   * @param {string} targetDomain - Target domain
   * @returns {string} Rewritten style
   */
  rewriteInlineStyle(style, targetDomain) {
    if (!style) return style;

    return style.replace(/url\(['"]?([^'")\s]+)['"]?\)/gi, (match, url) => {
      const newUrl = this.rewriteUrl(url, targetDomain);
      return newUrl ? `url('${newUrl}')` : match;
    });
  }

  /**
   * Rewrite meta refresh content
   * @param {string} content - Meta refresh content
   * @param {string} targetDomain - Target domain
   * @returns {string} Rewritten content
   */
  rewriteMetaRefresh(content, targetDomain) {
    if (!content) return null;

    const match = content.match(/(\d+);\s*url=(.+)/i);
    if (match) {
      const [, delay, url] = match;
      const newUrl = this.rewriteUrl(url.trim(), targetDomain);
      if (newUrl) {
        return `${delay}; url=${newUrl}`;
      }
    }
    return null;
  }

  /**
   * Rewrite CSS content (for stylesheet responses)
   * @param {string} css - CSS content
   * @param {string} targetDomain - Target domain
   * @returns {string} Rewritten CSS
   */
  rewriteCss(css, targetDomain) {
    if (!css) return css;

    // Convert buffer to string if needed
    const cssString = Buffer.isBuffer(css) ? css.toString('utf-8') : css;

    // Rewrite url() references in CSS
    return cssString.replace(/url\(['"]?([^'")\s]+)['"]?\)/gi, (match, url) => {
      const newUrl = this.rewriteUrl(url, targetDomain);
      return newUrl ? `url('${newUrl}')` : match;
    });
  }
}

module.exports = new RewriteService();


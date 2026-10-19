'use strict';

/*
 * Post sections get a serif number (01, 02 …) from a CSS counter
 * (45-post.css). Headings the author already numbered ("1. 先吃个瓜") are
 * marked here so they do not end up as "01 1. 先吃个瓜".
 */
const NUMBERED = /<h2 id="([^"]*)">(\s*\d+[.、．)）])/g;

hexo.extend.filter.register('after_post_render', data => {
  if (data.layout === 'post' && data.content) {
    data.content = data.content.replace(NUMBERED, '<h2 id="$1" class="lm-own-number">$2');
  }
  return data;
});

'use strict';

/*
 * Keep each post's tags in front-matter order (the first tag is the main
 * topic). Hexo's post.tags returns tags in the global Tag collection's
 * insertion order, which depends on the order posts happen to be processed
 * and changed between Hexo 7 and 8. The PostTag relation is written in
 * front-matter order, so sort by it. Post meta, feeds, Open Graph and the
 * search index all read post.tags.
 */
const tags = hexo.model('Post').schema.paths.tags;
const original = tags.getter;

tags.getter = function () {
  const query = original.call(this);
  const order = hexo.model('PostTag').find({ post_id: this._id }, { lean: true }).map(ref => ref.tag_id);
  if (order.length < 2) return query;
  const rank = new Map(order.map((id, index) => [id, index]));
  return new (hexo.model('Tag').Query)(query.toArray().sort((a, b) => rank.get(a._id) - rank.get(b._id)));
};

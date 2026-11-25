"use client";

export function Post({ post }: { post: { title: string; body_html: string } }) {
  return (
    <article>
      <h2>{post.title}</h2>
      <div dangerouslySetInnerHTML={{ __html: post.body_html }} />
    </article>
  );
}

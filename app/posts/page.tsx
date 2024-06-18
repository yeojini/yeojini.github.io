import Post from '@/app/posts/post/page';
import { getPosts } from '@/lib/getPosts';

export default async function Posts() {
  const files = await getPosts();
  return (
    <div>
      {files.reverse().map(({sha, name})=>
      <Post key={sha} sha={sha} name={name}/>)}
    </div>
  );
}

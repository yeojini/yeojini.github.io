import { getPost } from '@/lib/getPosts';
import { MDXRemote } from 'next-mdx-remote/rsc'

interface PostProps {
  sha: string;
  name: string;
}


export default async function Post({ sha, name }: PostProps) {
  const blobData = await getPost(sha);
  if(!blobData) return;

  return <MDXRemote source={atob(blobData.content)} />
}


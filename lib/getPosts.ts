
import { RawPost } from '@/types';
import { Octokit } from 'octokit';
const accessToken = process.env.GITHUB_API_KEY;
const owner = 'yeojini';
const repo = 'yeojini.github.io';

const octokit = new Octokit({ auth: accessToken });

export const getPosts = async ():Promise<RawPost[]> => {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '',
      mediaType: {
        format: 'raw'
      },
    });
    if (!Array.isArray(data)) return [];
    return data.filter(file => file.name.endsWith('.md'));
  } catch (error) {
    console.error('Error fetching files:', error);
    return [];
  }
}

export const getPost = async (sha: string) => {
  try {
    const { data } = await octokit.rest.git.getBlob({
      owner,
      repo,
      file_sha: sha,
    });
    return data;
  } catch (error) {
    console.log('Error fetching file:', error);
  }
}
'use client'

import { Octokit } from 'octokit';
import { useEffect, useState } from 'react';
import { components } from "@octokit/openapi-types";

type DirectoryItem = components["schemas"]["content-directory"][number];

const accessToken = process.env.GITHUB_API_KEY;

const octokit = new Octokit({ auth: accessToken });

const fetchContent = async ():Promise<DirectoryItem[]> => {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: 'yeojini',
      repo: 'yeojini.github.io',
      path: '',
    });
    if (!Array.isArray(data)) return [];
    return data.filter(file => file.name.endsWith('.md'));
  } catch (error) {
    console.error('Error fetching files:', error);
    return [];
  }
}
export default function Posts() {
  const [data, setData] = useState<DirectoryItem[]>([]);
  useEffect(()=>{
    const fetchData = async () => {
      const files = await fetchContent();
        setData(files);
    };
    fetchData();
  },[]);
  return (
    <div>
      {data.map((item)=>{
        return item.name;
      })}
    </div>
  );
}
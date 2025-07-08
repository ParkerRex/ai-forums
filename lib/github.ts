import useSWR from 'swr'

interface LastCommitData {
  timestamp: string
  sha: string
  message: string
  author: string
}

interface GitHubIssue {
  id: number
  number: number
  title: string
  html_url: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch')
  }
  return res.json()
}

export function useLastCommit() {
  const { data, error, isLoading } = useSWR<LastCommitData>(
    '/api/last-commit',
    fetcher,
    {
      refreshInterval: 60000, // Refresh every 60 seconds
      revalidateOnFocus: false,
    }
  )

  return {
    lastCommit: data ? new Date(data.timestamp) : null,
    commitData: data,
    isLoading,
    isError: error,
  }
}

export function useGitHubIssues(page = 1) {
  const { data, error, isLoading, mutate } = useSWR<GitHubIssue[]>(
    `/api/github/issues?page=${page}`,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every 60 seconds
      revalidateOnFocus: false,
    }
  )

  return {
    issues: data || [],
    isLoading,
    error,
    refetch: mutate,
  }
}
import useSWR from 'swr'

interface LastCommitData {
  timestamp: string
  sha: string
  message: string
  author: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch last commit')
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
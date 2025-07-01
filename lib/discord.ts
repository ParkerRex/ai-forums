import useSWR from 'swr'

interface DiscordPresenceResponse {
  presence_count: number
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export function useDiscordPresence() {
  const { data, error } = useSWR<DiscordPresenceResponse>(
    '/api/discord',
    fetcher,
    {
      refreshInterval: 60000, // Refresh every 60 seconds
      revalidateOnFocus: false,
    }
  )

  return {
    presenceCount: data?.presence_count ?? null,
    isLoading: !error && !data,
    isError: error,
  }
}
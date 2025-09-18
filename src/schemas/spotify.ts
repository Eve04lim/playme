import { z } from 'zod'

export const SpotifyAuthResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string()
})

export const SpotifyTrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  artists: z.array(z.object({
    id: z.string(),
    name: z.string()
  })),
  album: z.object({
    id: z.string(),
    name: z.string(),
    images: z.array(z.object({
      url: z.string(),
      width: z.number(),
      height: z.number()
    })),
    release_date: z.string()
  }),
  duration_ms: z.number(),
  preview_url: z.string().nullable(),
  external_urls: z.object({
    spotify: z.string()
  }),
  popularity: z.number()
})

export const SpotifySearchTracksResponseSchema = z.object({
  tracks: z.object({
    items: z.array(SpotifyTrackSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number()
  })
})

export const SpotifyUserProfileSchema = z.object({
  id: z.string(),
  display_name: z.string().nullable(),
  email: z.string(),
  images: z.array(z.object({
    url: z.string(),
    width: z.number().nullable(),
    height: z.number().nullable()
  })),
  followers: z.object({
    total: z.number()
  }),
  country: z.string()
})

export const SpotifyPlaylistSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  images: z.array(z.object({
    url: z.string(),
    width: z.number().nullable(),
    height: z.number().nullable()
  })),
  tracks: z.object({
    total: z.number()
  }),
  public: z.boolean(),
  owner: z.object({
    id: z.string(),
    display_name: z.string().nullable()
  })
})

export type SpotifyAuthResponse = z.infer<typeof SpotifyAuthResponseSchema>
export type SpotifyTrack = z.infer<typeof SpotifyTrackSchema>
export type SpotifySearchTracksResponse = z.infer<typeof SpotifySearchTracksResponseSchema>
export type SpotifyUserProfile = z.infer<typeof SpotifyUserProfileSchema>
export type SpotifyPlaylist = z.infer<typeof SpotifyPlaylistSchema>
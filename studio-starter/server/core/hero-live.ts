export type HeroLiveMode = 'motion' | 'fit'

/** Hero 2 está en la home solo si fue elegido y tiene archivo. */
export function liveHeroMode(mode: string | undefined, hasMedia: boolean): HeroLiveMode {
  return mode === 'fit' && hasMedia ? 'fit' : 'motion'
}

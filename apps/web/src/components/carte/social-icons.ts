import type { ComponentType, SVGProps } from 'react'
import {
  FacebookIcon, InstagramIcon, LinkedInIcon, TikTokIcon, XIcon, YouTubeIcon,
} from '@/components/kit/BrandIcons'
import type { SocialKey } from './card-model'

/** Logo de chaque réseau (carte et éditeur). */
export const SOCIAL_ICONS: Record<SocialKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  facebook: FacebookIcon, instagram: InstagramIcon, tiktok: TikTokIcon,
  linkedin: LinkedInIcon, youtube: YouTubeIcon, x: XIcon,
}

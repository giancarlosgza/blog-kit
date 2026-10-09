<script setup lang="ts">
/** Interfaces */
interface IProps {
  kind?: string
  title?: string
  description?: string
  author?: string
  date?: string
  accentColor?: string
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  kind: 'Article',
  title: '',
  description: '',
  author: '',
  date: '',
  accentColor: ''
})

/** Composables */
const brand = useAppConfig().blog
const siteHost = new URL(useSiteUrl()).host

/** Constants */
const HEX_COLOR_REGEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/** Helpers */
function isLightColor(hex: string): boolean {
  const normalized = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex
  const red = Number.parseInt(normalized.slice(1, 3), 16) / 255
  const green = Number.parseInt(normalized.slice(3, 5), 16) / 255
  const blue = Number.parseInt(normalized.slice(5, 7), 16) / 255
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
  return luminance > 0.6
}

/** Computed */
const titleText = computed(() => props.title || brand.name)
const descriptionText = computed(() => props.description || brand.description)
const bandColor = computed(() => (HEX_COLOR_REGEX.test(props.accentColor) ? props.accentColor : brand.ogImage.accentColor))
const bandIsLight = computed(() => isLightColor(bandColor.value))
const bandTextColor = computed(() => (bandIsLight.value ? '#0b0811' : '#ffffff'))
const bandLogoFilter = computed(() => (bandIsLight.value ? 'none' : 'invert(1)'))
const bylineLabel = computed(() => [props.author, props.date].filter(Boolean).join(' · '))
const titleFontSize = computed(() => {
  const length = titleText.value.length
  if (length <= 40)
    return '56px'
  if (length <= 70)
    return '44px'
  return '36px'
})
</script>

<template>
  <div
    style="width: 100%; height: 100%; display: flex; flex-direction: row; background: #0b0811; color: #ffffff; overflow: hidden; font-family: 'DM Sans', sans-serif;"
  >
    <!-- Accent band -->
    <div
      :style="{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '400px',
        padding: '56px 40px 56px 56px',
        boxSizing: 'border-box',
        background: bandColor,
        color: bandTextColor,
      }"
    >
      <img
        v-if="brand.ogImage.logo"
        :src="brand.ogImage.logo"
        :alt="brand.organization.name || brand.shortName"
        :style="{ display: 'block', width: '150px', height: 'auto', filter: bandLogoFilter }"
      >
      <div v-else />
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div
          v-if="brand.ogImage.kicker"
          style="font-size: 14px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; opacity: 0.8;"
        >
          {{ brand.ogImage.kicker }}
        </div>
        <div style="font-size: 96px; font-weight: 800; line-height: 0.95; letter-spacing: -4px;">
          {{ brand.ogImage.title }}
        </div>
      </div>
      <div style="font-size: 18px; font-weight: 600; opacity: 0.85;">
        {{ siteHost }}
      </div>
    </div>

    <!-- Entry -->
    <div style="display: flex; flex-direction: column; justify-content: space-between; flex: 1; padding: 56px 64px; box-sizing: border-box;">
      <div style="font-size: 14px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.55);">
        {{ props.kind }}
      </div>
      <div style="display: flex; flex-direction: column; gap: 20px;">
        <div :style="{ fontSize: titleFontSize, fontWeight: '800', lineHeight: '1.05', letterSpacing: '-2px', textWrap: 'balance' }">
          {{ titleText }}
        </div>
        <div style="font-size: 24px; line-height: 1.4; color: rgba(255,255,255,0.68); text-wrap: balance;">
          {{ descriptionText }}
        </div>
      </div>
      <div style="font-size: 16px; font-weight: 600; color: rgba(255,255,255,0.55);">
        {{ bylineLabel }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/** Interfaces */
export type LogoType = 'icon' | 'wordmark'

interface IAppLogoProps {
  type?: LogoType
  width?: string | number
  height?: string | number
  alt?: string
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'auto' | 'sync'
  customClass?: string | string[] | Record<string, boolean>
  invert?: boolean
}

/** Props */
const props = withDefaults(defineProps<IAppLogoProps>(), {
  type: 'wordmark',
  loading: 'eager',
  decoding: 'async',
  invert: true
})

/** Composables */
const { organization } = useAppConfig().admin

/** Computed */
const altText = computed(() => props.alt ?? `${organization} Logo`)
const logoSrc = computed(() => {
  return props.type === 'icon'
    ? '/icon-pwa.png'
    : '/logo-wordmark.svg'
})
const computedWidth = computed(() => {
  if (props.width !== undefined)
    return props.width
  return props.type === 'icon' ? 192 : 1012
})
const computedHeight = computed(() => {
  if (props.height !== undefined)
    return props.height
  return props.type === 'icon' ? 192 : 252
})
const computedClasses = computed(() => {
  const classes: string[] = []
  if (props.type === 'wordmark' && props.invert) {
    classes.push('filter-invert')
  }
  return classes
})
</script>

<template>
  <img
    :src="logoSrc"
    :alt="altText"
    :width="computedWidth"
    :height="computedHeight"
    :loading="loading"
    :decoding="decoding"
    :class="[computedClasses, customClass]"
    class="img-fluid"
  >
</template>

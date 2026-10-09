<script setup lang="ts">
import type { BrandIcon } from '#admin/app/utils/brand-icons'

/** Interfaces */
interface IAuthSocialProvider {
  id: string
  name: string
  icon: BrandIcon
  size: any
}
interface IAuthSocialButtonsProps {
  providers: IAuthSocialProvider[]
  actionText: string
  activeProvider?: string | null
  isSocialLoading?: boolean
  disabled?: boolean
}
interface IAuthSocialButtonsEmits {
  (e: 'select', providerId: string): void
}

/** Props */
const {
  providers,
  actionText,
  activeProvider = null,
  isSocialLoading = false,
  disabled = false
} = defineProps<IAuthSocialButtonsProps>()

/** Emit */
const emit = defineEmits<IAuthSocialButtonsEmits>()

/** Computed */
const primaryProvider = computed((): IAuthSocialProvider | undefined => providers[0])
const secondaryProviders = computed((): IAuthSocialProvider[] => providers.slice(1))
</script>

<template>
  <div
    class="auth-social"
    role="group"
    :aria-label="`${actionText} a social account`"
  >
    <UiButton
      v-if="primaryProvider"
      variant="outline"
      :text="`${actionText} ${primaryProvider.name}`"
      :loading="isSocialLoading && activeProvider === primaryProvider.id"
      :disabled="disabled"
      :aria-label="`${actionText} ${primaryProvider.name}`"
      size="lg"
      fluid
      rounded
      @click="emit('select', primaryProvider.id)"
    >
      <template #icon>
        <UiIconSvg
          :content="getBrandIcon(primaryProvider.icon)"
          :class="getBrandIconClass(primaryProvider.icon)"
          :size="primaryProvider.size"
        />
      </template>
    </UiButton>

    <div
      v-if="secondaryProviders.length"
      class="auth-social-row"
    >
      <UiButton
        v-for="provider in secondaryProviders"
        :key="provider.id"
        variant="outline"
        :title="provider.name"
        :loading="isSocialLoading && activeProvider === provider.id"
        :disabled="disabled"
        :aria-label="`${actionText} ${provider.name}`"
        size="lg"
        fluid
        rounded
        @click="emit('select', provider.id)"
      >
        <template #icon>
          <UiIconSvg
            :content="getBrandIcon(provider.icon)"
            :class="getBrandIconClass(provider.icon)"
            :size="provider.size"
          />
        </template>
      </UiButton>
    </div>
  </div>
</template>

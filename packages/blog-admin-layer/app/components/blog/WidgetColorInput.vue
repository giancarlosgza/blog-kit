<script setup lang="ts">
/** Interfaces */
interface IProps {
  id: string
  label: string
  modelValue?: string | null
  placeholder?: string
}
interface IEmits {
  'update:modelValue': [value: string]
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  modelValue: '',
  placeholder: '#000000 or oklch(60% 0.2 280)'
})

/** Emit */
const emit = defineEmits<IEmits>()

/** Data */
const lastHex = ref('#000000')
let canvasContext: CanvasRenderingContext2D | null = null

/** Computed */
const text = computed(() => props.modelValue ?? '')
const pickerHex = computed(() => resolveHex(text.value) ?? lastHex.value)

/** Watch */
watch(pickerHex, value => (lastHex.value = value), { immediate: true })

/** Methods */
function resolveHex(value: string): string | null {
  const direct = toPickerHex(value)
  if (direct || !import.meta.client || !value.trim() || !CSS.supports('color', value))
    return direct

  canvasContext ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  if (!canvasContext)
    return null
  canvasContext.clearRect(0, 0, 1, 1)
  canvasContext.fillStyle = value
  canvasContext.fillRect(0, 0, 1, 1)
  const [r = 0, g = 0, b = 0] = canvasContext.getImageData(0, 0, 1, 1).data
  return rgbToHex(r, g, b)
}
function onText(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
function onPick(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <div class="form-group mb-0">
    <label
      :for="`${id}-text`"
      class="mb-2"
    >{{ label }}</label>
    <div class="form-color-group form-sm">
      <input
        :id="`${id}-color`"
        type="color"
        class="form-color"
        :value="pickerHex"
        :aria-label="`${label} picker`"
        @input="onPick"
      >
      <input
        :id="`${id}-text`"
        type="text"
        class="form-control"
        :value="text"
        :placeholder="placeholder"
        spellcheck="false"
        autocomplete="off"
        @input="onText"
      >
    </div>
  </div>
</template>

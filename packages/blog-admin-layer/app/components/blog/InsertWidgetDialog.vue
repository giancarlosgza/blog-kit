<script setup lang="ts">
import type { IDialogDisplay } from '@colorffy/ui'
import type { WidgetDescriptor } from '@giancarlosgza/blog-core'

/** Interfaces */
interface IProps {
  open: boolean
  mode: 'insert' | 'edit'
  initialKey?: string
  initialProps?: Record<string, unknown>
}
interface IEmits {
  confirm: [payload: { widgetKey: string, props: Record<string, unknown> }]
  close: []
}

/** Props */
const props = defineProps<IProps>()

/** Emit */
const emit = defineEmits<IEmits>()

/** Composables */
const { keys: widgetKeys, getDescriptor: getWidgetDescriptor } = useWidgetRegistry()

/** Data */
const modal = ref<IDialogDisplay | null>(null)
const selectedKey = ref<string>('')
const form = reactive<Record<string, any>>({})

/** Computed */
const descriptor = computed<WidgetDescriptor | undefined>(() =>
  selectedKey.value ? getWidgetDescriptor(selectedKey.value) : undefined
)
const widgetOptions = computed(() => widgetKeys.map(key => ({ value: key, label: getWidgetDescriptor(key)?.name ?? key })))
const dialogTitle = computed(() => props.mode === 'edit' ? 'Edit widget' : 'Insert widget')

/** Watch */
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    selectedKey.value = props.initialKey || ''
    resetForm(getWidgetDescriptor(selectedKey.value), props.initialProps)
    modal.value?.showDialog()
  } else {
    modal.value?.closeDialog()
  }
})
watch(selectedKey, (key) => {
  resetForm(getWidgetDescriptor(key), props.mode === 'edit' ? props.initialProps : undefined)
})

/** Methods */
function resetForm(desc?: WidgetDescriptor, initial?: Record<string, unknown>) {
  Object.keys(form).forEach(key => delete form[key])
  if (!desc)
    return
  for (const [key, schema] of Object.entries(desc.props)) {
    form[key] = initial && key in initial ? initial[key] : schema.default
  }
}
function confirm() {
  if (!descriptor.value)
    return
  emit('confirm', { widgetKey: selectedKey.value, props: normalizeWidgetProps(descriptor.value, form) })
}
function onModalClose() {
  if (props.open)
    emit('close')
}
</script>

<template>
  <UiModal
    ref="modal"
    mode="side-sheet"
    aria-labelledby="widget-dialog-title"
    aria-describedby="widget-dialog-description"
    @close="onModalClose"
  >
    <template #header>
      <h2
        id="widget-dialog-title"
        class="dialog-title fs-base fw-800"
      >
        {{ dialogTitle }}
      </h2>
      <span
        id="widget-dialog-description"
        class="visually-hidden"
      >
        Choose an interactive widget and set its options before embedding it in the post.
      </span>
      <UiButton
        variant="outline"
        :title="`Close ${dialogTitle.toLowerCase()} dialog`"
        :aria-label="`Close ${dialogTitle.toLowerCase()} dialog`"
        icon
        size="sm"
        @click="emit('close')"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe5cd;" />
        </template>
      </UiButton>
    </template>
    <template #body>
      <section
        aria-labelledby="widget-section"
        @keydown.enter.prevent="confirm"
      >
        <h3
          id="widget-section"
          class="subtitle-1 fw-500 mb-3"
        >
          Widget details
        </h3>
        <div class="d-grid gap-3">
          <UiInputSelect
            id="widget-key"
            v-model="selectedKey"
            label="Widget"
            placeholder="Choose a widget…"
            :options="widgetOptions"
            option-label="label"
            option-value="value"
            :disabled="mode === 'edit'"
            size="sm"
            class="mb-0"
          />

          <template v-if="descriptor">
            <p class="fs-3xs text-muted mb-0">
              {{ descriptor.description }}
            </p>

            <div
              v-for="(schema, key) in descriptor.props"
              :key="key"
              class="d-grid gap-2"
            >
              <UiInputSelect
                v-if="schema.type === 'enum'"
                :id="`widget-prop-${key}`"
                v-model="form[key]"
                :label="schema.label"
                :options="schema.options"
                option-label="label"
                option-value="value"
                placeholder="Select an option"
                size="sm"
                class="mb-0"
              />
              <UiInputCheck
                v-else-if="schema.type === 'boolean'"
                :id="`widget-prop-${key}`"
                v-model="form[key]"
                :label="schema.label"
                variant="switch"
              />
              <UiInputText
                v-else-if="schema.type === 'number'"
                :id="`widget-prop-${key}`"
                v-model.number="form[key]"
                :label="schema.label"
                type="number"
                :min="schema.min ?? null"
                :max="schema.max ?? null"
                size="sm"
                class="mb-0"
              />
              <BlogWidgetColorInput
                v-else-if="schema.type === 'color'"
                :id="`widget-prop-${key}`"
                v-model="form[key]"
                :label="schema.label"
                :placeholder="schema.required ? undefined : 'Leave empty to skip'"
              />
              <UiInputText
                v-else
                :id="`widget-prop-${key}`"
                v-model="form[key]"
                :label="schema.label"
                size="sm"
                class="mb-0"
              />
              <p
                v-if="schema.help || (schema.type === 'number' && numberRangeHint(schema))"
                class="fs-3xs text-muted mb-0"
              >
                {{ [schema.help, schema.type === 'number' ? numberRangeHint(schema) : null].filter(Boolean).join(' ') }}
              </p>
            </div>
          </template>
        </div>
      </section>
    </template>
    <template #footer>
      <UiButton
        variant="text"
        class="text-neutral"
        text="Close"
        :title="`Close ${dialogTitle.toLowerCase()} dialog`"
        :aria-label="`Close ${dialogTitle.toLowerCase()} dialog`"
        @click="emit('close')"
      />
      <UiButton
        variant="filled"
        :text="mode === 'edit' ? 'Update widget' : 'Insert widget'"
        :disabled="!descriptor"
        @click="confirm"
      />
    </template>
  </UiModal>
</template>

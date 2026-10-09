<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'

/** Interfaces */
interface IProps {
  node: { attrs: { widgetKey: string, props: Record<string, unknown> } }
  getPos: () => number | undefined
  deleteNode: () => void
  selected: boolean
}

/** Props */
const props = defineProps<IProps>()

/** Composables */
const { getDescriptor, preview: widgetPreview } = useWidgetRegistry()
const requestEdit = inject<(pos: number, widgetKey: string, widgetProps: Record<string, unknown>) => void>(
  'blog-widget-edit',
  () => {}
)

/** Computed */
const descriptor = computed(() => getDescriptor(props.node.attrs.widgetKey))
const propEntries = computed(() => Object.entries(props.node.attrs.props ?? {}))
const preview = computed(() => widgetPreview(props.node.attrs.widgetKey, props.node.attrs.props ?? {}))

/** Methods */
function onEdit() {
  const pos = props.getPos()
  if (pos === undefined)
    return
  requestEdit(pos, props.node.attrs.widgetKey, props.node.attrs.props ?? {})
}
</script>

<template>
  <NodeViewWrapper
    class="widget-node"
    :class="{ 'is-selected': selected, 'is-unknown': !descriptor }"
  >
    <div class="widget-node-head">
      <div class="d-flex align-items-center gap-2">
        <UiIconMaterial
          :icon-code="descriptor?.icon || '&#xe1bd;'"
          class="icon-wrap icon-wrap-sm icon-wrap-outline"
        />
        <div>
          <p class="subtitle-2 fw-500 mb-0">
            {{ descriptor?.name || `Unknown widget: ${node.attrs.widgetKey}` }}
          </p>
          <p
            v-if="descriptor"
            class="fs-3xs text-muted mb-0"
          >
            {{ descriptor.description }}
          </p>
        </div>
      </div>

      <UiButtonGroup
        connected
        class="flex-nowrap"
      >
        <UiButton
          variant="outline"
          icon
          size="sm"
          title="Edit widget"
          aria-label="Edit widget"
          @click="onEdit"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe3c9;" />
          </template>
        </UiButton>
        <UiButton
          variant="outline"
          icon
          size="sm"
          title="Remove widget"
          aria-label="Remove widget"
          @click="deleteNode()"
        >
          <template #icon>
            <UiIconMaterial
              icon-code="&#xe872;"
              class="text-danger"
            />
          </template>
        </UiButton>
      </UiButtonGroup>
    </div>

    <div
      v-if="preview"
      class="widget-node-preview"
    >
      <span
        v-if="preview.gradient"
        class="widget-node-gradient"
        :style="{ backgroundImage: preview.gradient }"
        aria-hidden="true"
      />
      <span
        v-else-if="preview.sample"
        class="widget-node-sample"
        :style="{ color: preview.sample.color, backgroundColor: preview.sample.background }"
        aria-hidden="true"
      >Aa</span>
      <span
        v-else-if="preview.swatches.length"
        class="widget-node-swatches"
        aria-hidden="true"
      >
        <span
          v-for="(swatch, index) in preview.swatches"
          :key="index"
          :style="{ backgroundColor: swatch }"
        />
      </span>
      <p class="fs-3xs mb-0">
        {{ preview.label }}
      </p>
    </div>

    <dl
      v-if="propEntries.length"
      class="widget-node-props"
    >
      <template
        v-for="[key, value] in propEntries"
        :key="key"
      >
        <dt>{{ key }}</dt>
        <dd>{{ value }}</dd>
      </template>
    </dl>
  </NodeViewWrapper>
</template>

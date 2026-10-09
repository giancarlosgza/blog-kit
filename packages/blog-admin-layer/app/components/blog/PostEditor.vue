<script setup lang="ts">
import type { IDialogDisplay } from '@colorffy/ui'
import Image from '@tiptap/extension-image'
import StarterKit from '@tiptap/starter-kit'
import { Editor, EditorContent } from '@tiptap/vue-3'
import { BlogWidget } from '#admin/app/editor/blog-widget'

/** Interfaces */
interface IProps {
  modelValue: string
  uploadPath?: string
}
interface IEmits {
  'update:modelValue': [html: string]
}
interface IToolbarAction {
  id: string
  label: string
  icon: string
  run: () => void
  active?: boolean
  disabled?: boolean
  loading?: boolean
}
interface IToolbarGroup {
  id: string
  actions: IToolbarAction[]
}

/** Props */
const props = withDefaults(defineProps<IProps>(), {
  uploadPath: 'posts'
})

/** Emit */
const emit = defineEmits<IEmits>()

/** Data */
const imageInput = ref<HTMLInputElement>()
const hasWidgets = useWidgetRegistry().keys.length > 0
const editor = shallowRef<Editor>()
const editorState = ref<number>(0)
const linkDialog = ref<IDialogDisplay | null>(null)
const linkUrl = ref<string>('')
const dialog = reactive({
  open: false,
  mode: 'insert' as 'insert' | 'edit',
  key: '',
  props: {} as Record<string, unknown>,
  pos: -1
})
const CODE_LANGUAGES = [
  { label: 'Plain text', value: '' },
  { label: 'Bash', value: 'bash' },
  { label: 'CSS', value: 'css' },
  { label: 'SCSS', value: 'scss' },
  { label: 'HTML', value: 'html' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JSON', value: 'json' },
  { label: 'Vue', value: 'vue' },
  { label: 'Python', value: 'python' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'SQL', value: 'sql' },
  { label: 'YAML', value: 'yaml' }
]

/** Composables */
const {
  isUploading: isUploadingImage,
  upload: uploadImage,
  error: imageError
} = useImageUpload()
provide('blog-widget-edit', openEdit)

/** Computed */
const codeBlockLanguage = computed({
  get: () => {
    void editorState.value
    return (editor.value?.getAttributes('codeBlock').language as string | null) ?? ''
  },
  set: (language: string) => {
    editor.value?.chain().focus().updateAttributes('codeBlock', { language: language || null }).run()
  }
})
const toolbarGroups = computed<IToolbarGroup[]>(() => {
  void editorState.value
  const instance = editor.value
  return [
    {
      id: 'history',
      actions: [
        { id: 'undo', label: 'Undo', icon: '&#xe166;', disabled: !instance?.can().undo(), run: () => focusChain()?.undo().run() },
        { id: 'redo', label: 'Redo', icon: '&#xe15a;', disabled: !instance?.can().redo(), run: () => focusChain()?.redo().run() }
      ]
    },
    {
      id: 'marks',
      actions: [
        { id: 'bold', label: 'Bold', icon: '&#xe238;', active: isActive('bold'), run: () => focusChain()?.toggleBold().run() },
        { id: 'italic', label: 'Italic', icon: '&#xe23f;', active: isActive('italic'), run: () => focusChain()?.toggleItalic().run() }
      ]
    },
    {
      id: 'blocks',
      actions: [
        { id: 'heading-2', label: 'Heading 2', icon: '&#xf85e;', active: isActive('heading', { level: 2 }), run: () => focusChain()?.toggleHeading({ level: 2 }).run() },
        { id: 'heading-3', label: 'Heading 3', icon: '&#xf85f;', active: isActive('heading', { level: 3 }), run: () => focusChain()?.toggleHeading({ level: 3 }).run() },
        { id: 'bullet-list', label: 'Bullet list', icon: '&#xe241;', active: isActive('bulletList'), run: () => focusChain()?.toggleBulletList().run() },
        { id: 'ordered-list', label: 'Numbered list', icon: '&#xe242;', active: isActive('orderedList'), run: () => focusChain()?.toggleOrderedList().run() },
        { id: 'blockquote', label: 'Quote', icon: '&#xe244;', active: isActive('blockquote'), run: () => focusChain()?.toggleBlockquote().run() },
        { id: 'code-block', label: 'Code block', icon: '&#xe86f;', active: isActive('codeBlock'), run: () => focusChain()?.toggleCodeBlock().run() }
      ]
    },
    {
      id: 'link',
      actions: [
        { id: 'link', label: 'Link', icon: '&#xe157;', active: isActive('link'), run: setLink },
        ...(isActive('link')
          ? [{ id: 'unlink', label: 'Remove link', icon: '&#xe16f;', run: () => focusChain()?.unsetLink().run() }]
          : [])
      ]
    },
    {
      id: 'insert',
      actions: [
        { id: 'image', label: 'Insert image', icon: '&#xe3f4;', disabled: isUploadingImage.value, loading: isUploadingImage.value, run: pickImage },
        ...(hasWidgets ? [{ id: 'widget', label: 'Insert widget', icon: '&#xe1bd;', run: openInsert }] : [])
      ]
    }
  ]
})

/** Watch */
watch(() => props.modelValue, (value) => {
  const instance = editor.value
  if (instance && value !== instance.getHTML())
    instance.commands.setContent(value || '', { emitUpdate: false })
})

/** Lifecycle */
onMounted(() => {
  editor.value = new Editor({
    content: props.modelValue || '',
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener nofollow', target: '_blank' }
        }
      }),
      BlogWidget,
      Image.configure({ HTMLAttributes: { class: 'img-fluid' } })
    ],
    onUpdate: ({ editor: instance }) => emit('update:modelValue', instance.getHTML()),
    onTransaction: () => {
      editorState.value++
    }
  })
})
onBeforeUnmount(() => editor.value?.destroy())

/** Methods */
function focusChain() {
  return editor.value?.chain().focus()
}
function isActive(name: string, attrs?: Record<string, unknown>) {
  void editorState.value
  return editor.value?.isActive(name, attrs) ?? false
}
function openInsert() {
  dialog.open = true
  dialog.mode = 'insert'
  dialog.key = ''
  dialog.props = {}
  dialog.pos = -1
}
function openEdit(pos: number, key: string, widgetProps: Record<string, unknown>) {
  dialog.open = true
  dialog.mode = 'edit'
  dialog.key = key
  dialog.props = widgetProps
  dialog.pos = pos
}
function onConfirm({ widgetKey, props: widgetProps }: { widgetKey: string, props: Record<string, unknown> }) {
  const instance = editor.value
  if (!instance)
    return

  if (dialog.mode === 'edit' && dialog.pos >= 0) {
    instance.chain().focus().command(({ tr }) => {
      tr.setNodeMarkup(dialog.pos, undefined, { widgetKey, props: widgetProps })
      return true
    }).run()
  } else {
    instance.chain().focus().insertContent({
      type: 'blogWidget',
      attrs: { widgetKey, props: widgetProps }
    }).run()
  }
  dialog.open = false
}
function pickImage() {
  imageInput.value?.click()
}
function setLink() {
  const instance = editor.value
  if (!instance)
    return

  linkUrl.value = (instance.getAttributes('link').href as string | undefined) ?? ''
  linkDialog.value?.showDialog()
  nextTick(() => document.getElementById('link-url')?.focus())
}
function confirmLink() {
  const instance = editor.value
  if (instance) {
    const href = linkUrl.value.trim()
    const chain = instance.chain().focus().extendMarkRange('link')
    if (href === '')
      chain.unsetLink().run()
    else
      chain.setLink({ href }).run()
  }
  linkDialog.value?.closeDialog()
}
async function onImageSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file)
    return
  try {
    const src = await uploadImage(file, props.uploadPath)
    const alt = file.name.replace(/\.[^.]+$/, '')
    editor.value?.chain().focus().setImage({ src, alt }).run()
  } catch {
  }
}
</script>

<template>
  <div class="rich-editor">
    <!-- Toolbar -->
    <div class="rich-editor-toolbar-container">
      <div
        class="rich-editor-toolbar inline-scroll"
        role="toolbar"
        aria-label="Formatting"
      >
        <template
          v-for="(group, gIndex) in toolbarGroups"
          :key="group.id"
        >
          <UiDivider
            v-if="gIndex"
            vertical
            custom-class="rich-editor-divider"
          />
          <UiButtonGroup
            connected
            class="flex-nowrap"
          >
            <UiButtonTooltip
              v-for="action in group.actions"
              :id="`editor-${action.id}`"
              :key="action.id"
              :variant="action.active ? 'tonal' : 'text'"
              :color="action.active ? 'secondary' : undefined"
              size="sm"
              icon
              :class="{ 'text-neutral': !action.active }"
              :tooltip-text="action.label"
              :aria-label="action.label"
              :disabled="action.disabled"
              :loading="action.loading"
              @click="action.run"
            >
              <template #icon>
                <UiIconMaterial :icon-code="action.icon" />
              </template>
            </UiButtonTooltip>
          </UiButtonGroup>
        </template>
        <template v-if="isActive('codeBlock')">
          <UiDivider
            vertical
            custom-class="rich-editor-divider"
          />
          <UiInputSelect
            id="code-block-language"
            v-model="codeBlockLanguage"
            label="Code block language"
            hide-label
            :options="CODE_LANGUAGES"
            option-label="label"
            option-value="value"
            placeholder="Select language"
            size="sm"
            class="mb-0"
          />
        </template>
      </div>
    </div>

    <!-- Image upload -->
    <input
      ref="imageInput"
      type="file"
      accept="image/*"
      class="d-none"
      @change="onImageSelected"
    >
    <UiAlert
      v-if="imageError"
      type="tonal"
      variant="danger"
      size="sm"
      :message="imageError"
      class="m-2"
    />

    <!-- Editor -->
    <EditorContent
      :editor="editor"
      class="rich-editor-content"
    />

    <!-- Dialogs -->
    <BlogInsertWidgetDialog
      :open="dialog.open"
      :mode="dialog.mode"
      :initial-key="dialog.key"
      :initial-props="dialog.props"
      @confirm="onConfirm"
      @close="dialog.open = false"
    />
    <UiModal
      ref="linkDialog"
      size="sm"
      aria-labelledby="link-dialog-title"
      aria-describedby="link-dialog-description"
    >
      <template #header>
        <h2
          id="link-dialog-title"
          class="dialog-title fs-base fw-800"
        >
          Link
        </h2>
        <span
          id="link-dialog-description"
          class="visually-hidden"
        >
          Set the URL for the selected text. Leave it empty to remove the link.
        </span>
        <UiButton
          variant="outline"
          title="Close link dialog"
          aria-label="Close link dialog"
          icon
          size="sm"
          @click="linkDialog?.closeDialog()"
        >
          <template #icon>
            <UiIconMaterial icon-code="&#xe5cd;" />
          </template>
        </UiButton>
      </template>
      <template #body>
        <UiInputText
          id="link-url"
          v-model="linkUrl"
          label="URL"
          placeholder="Ex. https://example.com"
          type="url"
          size="sm"
          class="mb-2"
          @keydown.enter.prevent="confirmLink"
        />
        <p class="fs-3xs text-muted mb-0">
          Leave empty to remove the link
        </p>
      </template>
      <template #footer>
        <UiButton
          variant="text"
          class="text-neutral"
          text="Close"
          title="Close link dialog"
          aria-label="Close link dialog"
          @click="linkDialog?.closeDialog()"
        />
        <UiButton
          variant="filled"
          text="Apply link"
          @click="confirmLink"
        />
      </template>
    </UiModal>
  </div>
</template>

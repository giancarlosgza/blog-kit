<script setup lang="ts">
import type { IDialogDisplay } from '@colorffy/ui'
import type { ITag } from '@giancarlosgza/blog-core'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

/** Interfaces */
interface ITagsDialogEmits {
  saved: [message: string]
}

/** Emit */
const emit = defineEmits<ITagsDialogEmits>()

/** Data */
const db = useFirestore()
const dialogRef = ref<IDialogDisplay | null>(null)
const isLoading = ref<boolean>(false)
const errorMessage = ref<string | null>(null)
const editingId = ref<string | null>(null)
const formName = ref<string>('')
const formSlug = ref<string>('')
const inputId = 'tag-name'

/** Computed */
const isEditing = computed(() => !!editingId.value)
const trimmedName = computed(() => formName.value.trim())
const trimmedSlug = computed(() => formSlug.value.trim())
const isSaveDisabled = computed(() => !trimmedName.value || isLoading.value)

/** Watch */
watch(formName, (newName, oldName) => {
  if (errorMessage.value)
    errorMessage.value = null
  if (isEditing.value)
    return
  if (!formSlug.value || formSlug.value === toSlug(oldName)) {
    formSlug.value = toSlug(newName)
  }
})

/** Methods */
async function saveTag(): Promise<void> {
  if (isSaveDisabled.value)
    return

  isLoading.value = true
  errorMessage.value = null

  try {
    if (isEditing.value && editingId.value) {
      await setDoc(doc(db, 'tags', editingId.value), {
        slug: trimmedSlug.value || toSlug(formName.value),
        updatedAt: serverTimestamp()
      }, { merge: true })
      emit('saved', 'Tag updated successfully')
    } else {
      const id = trimmedName.value
      const existing = await getDoc(doc(db, 'tags', id))
      if (existing.exists()) {
        errorMessage.value = 'A tag with this name already exists.'
        return
      }
      await setDoc(doc(db, 'tags', id), {
        name: id,
        slug: trimmedSlug.value || toSlug(formName.value),
        count: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      emit('saved', 'Tag created successfully')
    }
    closeDialog()
  } catch (error) {
    console.log('TagsDialog: saveTag', error)
    errorMessage.value = error instanceof Error ? error.message : 'Failed to save tag.'
  } finally {
    isLoading.value = false
  }
}
function focusInput(): void {
  nextTick(() => {
    document.getElementById(isEditing.value ? 'tag-slug' : inputId)?.focus()
  })
}

function showDialog(tag: ITag | null = null): void {
  editingId.value = tag?.id ?? null
  formName.value = tag?.name ?? ''
  formSlug.value = tag?.slug ?? ''
  errorMessage.value = null
  dialogRef.value?.showDialog()
  focusInput()
}
function closeDialog(): void {
  dialogRef.value?.closeDialog()
  errorMessage.value = null
}

defineExpose({
  showDialog,
  closeDialog
})
</script>

<template>
  <UiModal
    ref="dialogRef"
    mode="side-sheet"
    aria-labelledby="tag-dialog-title"
    aria-describedby="tag-dialog-description"
  >
    <template #header>
      <h2
        id="tag-dialog-title"
        class="dialog-title fs-base fw-800"
      >
        {{ isEditing ? 'Edit tag' : 'Create tag' }}
      </h2>
      <span
        id="tag-dialog-description"
        class="visually-hidden"
      >
        {{ isEditing ? 'Update the slug of the selected tag.' : 'Add a new tag. Posts reference tags by their name.' }}
      </span>
      <UiButton
        variant="outline"
        title="Close tag dialog"
        aria-label="Close tag dialog"
        icon
        size="sm"
        @click="closeDialog"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe5cd;" />
        </template>
      </UiButton>
    </template>
    <template #body>
      <!-- Error -->
      <UiAlert
        v-if="errorMessage"
        :message="errorMessage"
        type="tonal"
        variant="danger"
        size="sm"
        class="mb-3"
      />

      <!-- Form -->
      <section aria-labelledby="tag-details-section">
        <h3
          id="tag-details-section"
          class="subtitle-1 fw-500 mb-3"
        >
          Tag details
        </h3>
        <form
          id="tag-form"
          action="#"
          class="d-grid gap-3"
          @submit.prevent="saveTag"
        >
          <UiInputText
            :id="inputId"
            v-model="formName"
            label="Name"
            placeholder="Ex. CSS, Design"
            class="mb-0"
            :disabled="isEditing"
            required
          />
          <div class="d-grid gap-2">
            <UiInputText
              id="tag-slug"
              v-model="formSlug"
              label="Slug"
              placeholder="Ex. css, design"
              class="mb-0"
            />
            <p class="fs-3xs text-muted mb-0">
              {{ isEditing ? 'The name is the document ID and cannot be changed' : 'Generated from the name until edited' }}
            </p>
          </div>
        </form>
      </section>
    </template>
    <template #footer>
      <UiButton
        variant="text"
        class="text-neutral"
        text="Close"
        title="Close tag dialog"
        aria-label="Close tag dialog"
        @click="closeDialog"
      />
      <UiButton
        type="submit"
        form="tag-form"
        variant="filled"
        :text="isLoading ? 'Saving…' : (isEditing ? 'Save changes' : 'Save tag')"
        title="Save tag"
        :aria-label="isSaveDisabled ? 'Cannot save: missing required information' : 'Save tag'"
        :disabled="isSaveDisabled"
        :loading="isLoading"
      />
    </template>
  </UiModal>
</template>

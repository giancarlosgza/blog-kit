<script setup lang="ts">
import type { IDialogDisplay } from '@colorffy/ui'
import type { AdminRole } from '#admin/shared/models/admin'

/** Interfaces */
interface IEmits {
  saved: [message: string]
  error: [message: string]
}

/** Emit */
const emit = defineEmits<IEmits>()

/** Data */
const apiFetch = useApiFetch()
const dialogRef = useTemplateRef<IDialogDisplay>('dialogRef')
const isSaving = ref<boolean>(false)
const roleOptions: Array<{ label: string, value: AdminRole }> = [
  { label: 'Admin', value: 'admin' },
  { label: 'Editor', value: 'editor' }
]
const roleDescriptions: Record<AdminRole, string> = {
  admin: 'Full access — manage posts, authors, tags, settings and other admins.',
  editor: 'Content only — manage posts, authors and tags. No access to Admins or Settings.'
}
const roleVariants: Record<AdminRole, 'primary' | 'accent'> = {
  admin: 'primary',
  editor: 'accent'
}
const form = ref(getDefaultForm())
const dialogError = ref<string>('')

/** Computed */
const canSave = computed<boolean>(() =>
  !!form.value.displayName.trim() && !!form.value.email.trim() && form.value.password.length >= 6 && !isSaving.value)

/** Methods */
function getDefaultForm() {
  return {
    displayName: '',
    email: '',
    password: '',
    role: 'editor' as AdminRole
  }
}
async function onSave() {
  if (isSaving.value)
    return

  dialogError.value = ''

  if (!form.value.displayName.trim()) {
    dialogError.value = 'Name is required.'
    return
  }
  if (!form.value.email.trim()) {
    dialogError.value = 'Email is required.'
    return
  }
  if (form.value.password.length < 6) {
    dialogError.value = 'Password must be at least 6 characters.'
    return
  }

  isSaving.value = true

  try {
    await apiFetch('/api/admins/create', {
      method: 'POST',
      body: {
        displayName: form.value.displayName.trim(),
        email: form.value.email.trim(),
        password: form.value.password,
        role: form.value.role
      }
    })

    emit('saved', 'User created successfully')
    dialogRef.value?.closeDialog()
  } catch (err: any) {
    dialogError.value = err.data?.statusMessage || err.data?.message || `Failed to create user. ${err.message || ''}`
  } finally {
    isSaving.value = false
  }
}
function showDialog() {
  form.value = getDefaultForm()
  dialogError.value = ''
  dialogRef.value?.showDialog()
  nextTick(() => {
    document.getElementById('user-display-name')?.focus()
  })
}
function closeDialog() {
  dialogRef.value?.closeDialog()
}

defineExpose({ showDialog, closeDialog })
</script>

<template>
  <UiModal
    ref="dialogRef"
    mode="side-sheet"
    aria-labelledby="create-user-dialog-title"
    aria-describedby="create-user-dialog-description"
  >
    <template #header>
      <h2
        id="create-user-dialog-title"
        class="dialog-title fs-base fw-800"
      >
        New user
      </h2>
      <span
        id="create-user-dialog-description"
        class="visually-hidden"
      >
        Create a Firebase Auth account and grant it admin or editor access to the blog admin.
      </span>
      <UiButton
        variant="outline"
        title="Close new user dialog"
        aria-label="Close new user dialog"
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
        v-if="dialogError"
        :message="dialogError"
        type="tonal"
        variant="danger"
        size="sm"
        class="mb-3"
      />

      <!-- Form -->
      <form
        id="create-user-form"
        action="#"
        @submit.prevent="onSave"
      >
        <section aria-labelledby="user-details-section">
          <h3
            id="user-details-section"
            class="subtitle-1 fw-500 mb-3"
          >
            User details
          </h3>
          <div class="d-grid gap-3">
            <UiInputText
              id="user-display-name"
              v-model="form.displayName"
              label="Name"
              placeholder="Full name"
              autocomplete="off"
              class="mb-0"
              required
            />
            <UiInputText
              id="user-email"
              v-model="form.email"
              label="Email"
              placeholder="name@example.com"
              type="email"
              autocomplete="off"
              class="mb-0"
              required
            />
            <UiInputText
              id="user-password"
              v-model="form.password"
              label="Password"
              placeholder="At least 6 characters"
              type="password"
              autocomplete="new-password"
              class="mb-0"
              required
            />
          </div>
        </section>

        <section
          aria-labelledby="user-role-section"
          class="mt-section"
        >
          <h3
            id="user-role-section"
            class="subtitle-1 fw-500 mb-3"
          >
            Access
          </h3>
          <div class="d-grid gap-3">
            <UiInputSelect
              id="user-role"
              v-model="form.role"
              label="Role"
              :options="roleOptions"
              option-label="label"
              option-value="value"
              class="mb-0"
            />
            <UiAlert
              :message="roleDescriptions[form.role]"
              :variant="roleVariants[form.role]"
              type="tonal"
              size="sm"
            />
          </div>
        </section>
      </form>
    </template>
    <template #footer>
      <UiButton
        variant="text"
        class="text-neutral"
        text="Close"
        title="Close new user dialog"
        aria-label="Close new user dialog"
        @click="closeDialog"
      />
      <UiButton
        type="submit"
        form="create-user-form"
        variant="filled"
        :text="isSaving ? 'Creating…' : 'Create user'"
        title="Create user"
        :aria-label="canSave ? 'Create user' : 'Cannot create: missing required information'"
        :disabled="!canSave"
        :loading="isSaving"
      >
        <template #icon>
          <UiIconMaterial icon-code="&#xe7fe;" />
        </template>
      </UiButton>
    </template>
  </UiModal>
</template>

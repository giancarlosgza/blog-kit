<script setup lang="ts">
const { blogPath } = useBlogPath()
</script>

<template>
  <div>
    <header class="container landing-header">
      <NuxtLink
        to="/"
        class="fw-600"
      >
        Acme
      </NuxtLink>
      <nav class="d-flex gap-3">
        <NuxtLink to="/">
          Home
        </NuxtLink>
        <NuxtLink :to="{ name: 'blog' }">
          Blog
        </NuxtLink>
      </nav>
    </header>

    <main>
      <slot />
    </main>

    <footer class="container landing-footer text-muted">
      <span>Acme landing</span>
      <a :href="blogPath('/rss.xml')">RSS</a>
    </footer>
  </div>
</template>

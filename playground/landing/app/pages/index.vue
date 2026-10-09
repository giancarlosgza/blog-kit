<script setup lang="ts">
useSeoMeta({
  title: 'Acme',
  description: 'A landing page with a blog under /blog.'
})
</script>

<template>
  <section class="container my-5 text-center">
    <h1 class="display-1">
      Acme
    </h1>
    <p class="subtitle-1 text-muted">
      The landing page owns `/`; the blog layer adds everything under `/blog`.
    </p>
    <NuxtLink
      :to="{ name: 'blog' }"
      class="btn btn-filled btn-rounded mt-4"
    >
      Read the blog
    </NuxtLink>
  </section>
</template>

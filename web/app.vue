<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
// Force dark mode class on <html>
useHead({ htmlAttrs: { class: 'dark' } })
</script>

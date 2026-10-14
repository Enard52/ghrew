<template>
  <span
    class="brand-mark"
    aria-hidden="true"
    :style="{
      maskImage: `url(${useRuntimeConfig().app.baseURL}brand/ghrew-mark.png)`,
    }"
  />
</template>

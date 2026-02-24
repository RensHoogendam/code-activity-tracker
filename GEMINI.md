# Code Activity Tracker - Engineering Standards

## Tech Stack
- **Framework:** Vue 3 (Composition API with `<script setup>`)
- **Language:** TypeScript (Strict mode)
- **Styling:** Tailwind CSS v4 + SCSS (with nesting)
- **Build Tool:** Vite

## Architectural Principles
- **Logic Location:** Move complex data processing to services (e.g., `bitbucketService.ts`). Keep components focused on UI and local state.
- **State Management:** Use Pinia stores (found in `src/stores/`) for cross-cutting concerns like refresh status.
- **Type Safety:** Always use explicit types for props, emits, and computed properties. Avoid `any` at all costs.

## Coding Standards

### Vue Components
- **Structure:** Always follow the order: `<script setup lang="ts">`, `<template>`, then `<style scoped lang="scss">`.
- **Style:** Always use `<style scoped lang="scss">`.
- **Nesting:** Utilize SCSS nesting for logical grouping of component styles.
- **Tailwind:** Use `@apply` for complex component styles to keep templates clean, while using inline utility classes for one-off adjustments.
- **Theme:** Always use custom theme variables defined in `src/style.css` (e.g., `bg-app-bg`, `text-brand-primary`).
- **Props/Emits:** Use the script-based `defineProps<Props>()` and `defineEmits<Emits>()` syntax with interfaces.

### TypeScript
- **Interfaces:** Prefer `interface` for object shapes (like Props) and `type` for unions or complex mappings.
- **Return Types:** Explicitly define return types for all computed properties and functions.
- **Path Aliases:** Use `@/` to reference the `src/` directory.

### UI/UX
- **Visual Feedback:** Always provide loading and error states for asynchronous operations.
- **Responsive Design:** Use Tailwind's breakpoint system (integrated into SCSS nesting) to ensure the dashboard works on all screen sizes.

## Workflow
- **Vite Config:** The project is configured to automatically inject `@reference "@/style.css"` into all SCSS blocks. Do not add this manually to components.
- **Theme Updates:** Any new global colors or spacing should be added to the `@theme` block in `src/style.css`.

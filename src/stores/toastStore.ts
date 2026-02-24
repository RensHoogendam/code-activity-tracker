import { reactive, readonly } from 'vue'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: number
  message: string
  type: ToastType
  duration?: number
}

const state = reactive({
  toasts: [] as Toast[]
})

let nextId = 0

export const useToast = () => {
  const addToast = (message: string, type: ToastType = 'info', duration: number = 5000) => {
    const id = nextId++
    const toast: Toast = { id, message, type, duration }
    state.toasts.push(toast)

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }

  const removeToast = (id: number) => {
    const index = state.toasts.findIndex(t => t.id === id)
    if (index !== -1) {
      state.toasts.splice(index, 1)
    }
  }

  return {
    toasts: readonly(state.toasts),
    addToast,
    removeToast,
    success: (msg: string, dur?: number) => addToast(msg, 'success', dur),
    error: (msg: string, dur?: number) => addToast(msg, 'error', dur),
    info: (msg: string, dur?: number) => addToast(msg, 'info', dur),
    warning: (msg: string, dur?: number) => addToast(msg, 'warning', dur)
  }
}

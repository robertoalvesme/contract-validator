export const useAuthStore = defineStore('auth', {
  state: () => ({
    handle: '',
    password: '',
  }),

  getters: {
    isLoggedIn: (state) => !!(state.handle && state.password),
  },

  actions: {
    setCredentials(handle: string, password: string, rememberHandle: boolean) {
      this.handle = handle
      this.password = password
      if (import.meta.client) {
        if (rememberHandle) {
          localStorage.setItem('cf_handle', handle)
        } else {
          localStorage.removeItem('cf_handle')
        }
      }
    },

    loadSavedHandle(): string {
      if (import.meta.client) {
        return localStorage.getItem('cf_handle') ?? ''
      }
      return ''
    },

    logout() {
      this.handle = ''
      this.password = ''
    },
  },
})

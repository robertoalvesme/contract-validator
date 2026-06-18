<script setup lang="ts">
// Redirect root to the appropriate page
const auth = useAuthStore()
await navigateTo(auth.isLoggedIn ? '/search' : '/login', { replace: true })
</script>

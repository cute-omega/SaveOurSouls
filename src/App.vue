<script setup>
</script>

<template>
  <div class="app">
    <header class="app-header">
      <h1>灯塔（Save Our Souls）</h1>
      <nav>
        <RouterLink to="/">风险日程</RouterLink>
        <span class="sep">|</span>
        <RouterLink to="/confirm">确认安全</RouterLink>
      </nav>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>

</template>

<style scoped>
.app {
  max-width: 980px;
  margin: 0 auto;
  padding: 16px;
}

.app-header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  align-items: center;
  justify-content: space-between;
}

.app-header h1 {
  font-size: 20px;
  margin: 0;
}

nav a {
  color: #2f74c0;
  text-decoration: none;
  margin-right: 8px;
}

nav a.router-link-active {
  font-weight: 600;
}

.sep {
  color: #999;
  margin: 0 8px;
}

.app-main {
  margin-top: 16px;
}
</style>
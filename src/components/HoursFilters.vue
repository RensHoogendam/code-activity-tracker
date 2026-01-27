<script setup>
const props = defineProps({
  filters: Object,
  repos: Array
})

const emit = defineEmits(['filter-change'])

function updateFilter(key, value) {
  emit('filter-change', { [key]: value })
}
</script>

<template>
  <div class="hours-filters">
    <div class="filter-group">
      <label>Repository:</label>
      <select 
        :value="filters.repo" 
        @change="updateFilter('repo', $event.target.value)"
      >
        <option value="">All Repositories</option>
        <option v-for="repo in repos" :key="repo" :value="repo">
          {{ repo }}
        </option>
      </select>
    </div>
    
    <div class="filter-group">
      <label>Date Range:</label>
      <select 
        :value="filters.dateRange" 
        @change="updateFilter('dateRange', parseInt($event.target.value))"
      >
        <option :value="3">Last 3 days</option>
        <option :value="7">Last week</option>
        <option :value="12">Last 12 days</option>
        <option :value="30">Last month</option>
      </select>
    </div>
    
    <div class="filter-group">
      <label>Type:</label>
      <select 
        :value="filters.type" 
        @change="updateFilter('type', $event.target.value)"
      >
        <option value="all">All</option>
        <option value="commits">Commits Only</option>
        <option value="pullrequests">Pull Requests Only</option>
      </select>
    </div>
    
    <div class="filter-info">
      <span class="author-info">
        Showing activity for: <strong>{{ filters.author }}</strong>
      </span>
    </div>
  </div>
</template>

<style scoped>
.hours-filters {
  background: white;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 25px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.08);
  display: flex;
  flex-wrap: wrap;
  gap: 25px;
  align-items: center;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 160px;
}

.filter-group label {
  font-weight: 600;
  color: #555;
  font-size: 0.9rem;
}

.filter-group select {
  padding: 10px 12px;
  border: 2px solid #e0e7ff;
  border-radius: 8px;
  background: white;
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.3s ease;
}

.filter-group select:focus {
  outline: none;
  border-color: #667eea;
}

.filter-group select:hover {
  border-color: #c7d2fe;
}

.filter-info {
  margin-left: auto;
  padding: 12px 20px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.author-info {
  color: #64748b;
  font-size: 0.95rem;
}

.author-info strong {
  color: #1e293b;
}

@media (max-width: 768px) {
  .hours-filters {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }
  
  .filter-group {
    min-width: auto;
  }
  
  .filter-info {
    margin-left: 0;
    text-align: center;
  }
}
</style>
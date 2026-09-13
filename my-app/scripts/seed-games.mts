const response = await fetch('http://localhost:3000/api/seed-games', { method: 'POST' })
const result = await response.json()

if (!response.ok) {
  throw new Error(result.error || 'Game seed request failed')
}

console.log(result.message)
export function heading(text) {
  console.log(`\n${text}`)
}

export function row(label, text) {
  console.log(`  ${label.padEnd(36)} ${text}`)
}

export function plan(dryRun, text) {
  return dryRun ? `would ${text}` : text
}

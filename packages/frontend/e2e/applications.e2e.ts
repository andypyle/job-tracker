import { expect, signIn, test } from './fixtures'

// The smallest file the backend accepts: it checks the content type and size, not the contents
const pdf = { name: 'resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF\n') }

test('add an application with a résumé, move it to Interviewing, download the résumé, delete it', async ({
  page,
  user,
}) => {
  await signIn(page, user)

  // Add
  await page.getByRole('button', { name: 'Add application' }).first().click()
  const add = page.getByRole('dialog', { name: 'Add application' })
  await add.getByRole('textbox', { name: 'Job title' }).fill('Staff Engineer')
  await add.getByRole('textbox', { name: 'Company' }).fill('Example Corp')
  await add.getByLabel(/^Resume/).setInputFiles(pdf)
  await add.getByRole('button', { name: 'Save application' }).click()
  await expect(add).toBeHidden()

  // Open it from the Active list
  await page.goto('/jobs/active')
  await page.getByRole('link', { name: 'Staff Engineer' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Staff Engineer' })).toBeVisible()
  const status = page.getByRole('combobox', { name: 'Status: Staff Engineer at Example Corp' })
  await expect(status).toHaveText('Applied')

  // Change status; it persists and lands in the history
  await status.click()
  await page.getByRole('option', { name: 'Interviewing' }).click()
  await expect(page.getByText('Moved to Interviewing')).toBeVisible()
  await page.reload()
  await expect(status).toHaveText('Interviewing')
  await expect(page.getByRole('region', { name: 'Status history' })).toContainText('Interviewing')

  // The résumé link is a signed storage URL that serves the PDF
  const resume = page.getByRole('region', { name: 'Details' }).getByRole('link', { name: /resume\.pdf/ })
  const href = await resume.getAttribute('href')
  expect(href).toBeTruthy()
  const download = await page.request.get(href!)
  expect(download.ok()).toBe(true)
  expect(download.headers()['content-type']).toContain('application/pdf')

  // Delete
  await page.getByRole('button', { name: 'Delete application' }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Delete this application?' })
  await confirm.getByRole('button', { name: 'Delete application' }).click()
  await expect(page).toHaveURL('/jobs/active')
  await expect(page.getByText('Application deleted')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Staff Engineer' })).toHaveCount(0)
})

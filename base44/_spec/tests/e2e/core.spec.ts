import { expect, test } from '@playwright/test'

test('homepage is marketing-led and uses no computer hero',async({page})=>{
  await page.goto('/')
  await expect(page.getByRole('heading',{name:/Expose What’s Broken/i})).toBeVisible()
  const hero=page.locator('.hero')
  await expect(hero).not.toContainText(/computer|laptop|phone|browser window|dashboard screenshot/i)
  await expect(hero.locator('.fracture')).toBeVisible()
})

test('core routes resolve',async({page})=>{
  for(const route of ['/sign-up','/checkout','/app','/app/audits','/app/outreach','/admin']){
    await page.goto(route)
    await expect(page.locator('body')).not.toContainText('That page fell through a crack.')
  }
})

test('outreach remains approval gated',async({page})=>{
  await page.goto('/app/outreach')
  await expect(page.getByText(/Outreach remains draft-only/i)).toBeVisible()
})

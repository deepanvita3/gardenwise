import {expect, test} from '@playwright/test';

const user = {id: '11111111-1111-4111-8111-111111111111', email: 'gardener@example.test', aud: 'authenticated'};
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + Buffer.from(JSON.stringify({
  sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600,
})).toString('base64url') + '.test';
const photo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');

async function openGarden(page, {primary = true, backup = false, plants = [], tasks = []} = {}) {
  let garden = {plants, tasks, journal: []};
  let rejectSaves = false;
  let rejectedWrites = 0;
  await page.route('https://*.supabase.co/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/auth/v1/token') {
      if (request.postDataJSON().password !== 'garden-test-password') {
        return route.fulfill({status: 400, json: {message: 'Invalid login credentials'}});
      }
      return route.fulfill({json: {access_token: token, refresh_token: 'test', expires_in: 3600, user}});
    }
    if (path === '/auth/v1/signup') return route.fulfill({json: user});
    if (path === '/auth/v1/logout') return route.fulfill({status: 204});
    if (path === '/rest/v1/garden_state') {
      if (request.method() === 'GET') return route.fulfill({json: [garden]});
      if (rejectSaves) {
        rejectedWrites++;
        return route.fulfill({status: 503, json: {message: 'Cloud temporarily unavailable'}});
      }
      garden = request.postDataJSON();
      return route.fulfill({status: 201});
    }
    throw new Error('Unexpected backend request: ' + path);
  });
  await page.route('https://api.open-meteo.com/**', route => primary ? route.fulfill({json: {
    current: {temperature_2m: 49},
    daily: {time: ['2026-11-27'], temperature_2m_max: [52], temperature_2m_min: [31],
      precipitation_sum: [0.35], precipitation_probability_max: [75]},
  }}) : route.fulfill({status: 503}));
  await page.route('https://api.weather.gov/**', route => {
    if (!backup) return route.fulfill({status: 503});
    if (route.request().url().includes('/points/')) {
      return route.fulfill({json: {properties: {forecast: 'https://api.weather.gov/gridpoints/SEW/128,74/forecast'}}});
    }
    return route.fulfill({json: {properties: {periods: [
      {startTime: '2026-11-27T06:00:00-08:00', isDaytime: true, temperature: 52, temperatureUnit: 'F', probabilityOfPrecipitation: {value: 75}},
      {startTime: '2026-11-27T18:00:00-08:00', isDaytime: false, temperature: 31, temperatureUnit: 'F'},
    ]}}});
  });
  await page.goto('/gardenwise/');
  return {rejectSaves: value => { rejectSaves = value; }, rejectedWrites: () => rejectedWrites};
}

const account = page => page.locator('.gwAccount');
const button = (page, name) => page.getByRole('button', {name, exact: true});
const dialog = page => page.getByRole('dialog');
const saveStatus = page => account(page).getByRole('status');
const nav = (page, name) => page.getByRole('navigation').getByRole('button', {name}).click();
const testPlant = {id: 1, name: 'Mint', nickname: 'Porch mint', variety: 'Spearmint', type: 'Herb', location: 'Porch', emoji: '🌱'};
const signIn = async page => {
  await page.getByLabel('Email', {exact: true}).fill(user.email);
  await page.getByLabel('Password', {exact: true}).fill('garden-test-password');
  await button(page, 'Sign in').click();
  await expect(account(page)).toBeVisible();
};
const addMint = async (page, nickname, image) => {
  await page.getByRole('button', {name: 'Add a plant'}).click();
  await dialog(page).getByLabel('Plant name').fill('Mint');
  await dialog(page).getByLabel('Category').selectOption('Herb');
  await dialog(page).getByLabel('Variety').fill('Spearmint');
  await dialog(page).getByLabel('Nickname').fill(nickname);
  if (image) await dialog(page).getByLabel('Plant photo').setInputFiles({name: 'plant.png', mimeType: 'image/png', buffer: photo});
  await button(dialog(page), 'Add plant').click();
};

test('rejects invalid credentials and toggles password visibility', async ({page}) => {
  await openGarden(page);
  await page.getByLabel('Email', {exact: true}).fill(user.email);
  const password = page.getByLabel('Password', {exact: true});
  await password.fill('wrong-password');
  await button(page, 'Show').click();
  await expect(password).toHaveAttribute('type', 'text');
  await button(page, 'Hide').click();
  await expect(password).toHaveAttribute('type', 'password');
  await button(page, 'Sign in').click();
  await expect(page.getByRole('status')).toHaveText('Invalid login credentials');
  await signIn(page);
  await page.reload();
  await expect(account(page)).toContainText(user.email);
  await button(page, 'Sign out').click();
  await expect(button(page, 'Sign in')).toBeVisible();
});

test('requests account confirmation after sign-up', async ({page}) => {
  await openGarden(page);
  await button(page, 'Create an account').click();
  await page.getByLabel('Email', {exact: true}).fill(user.email);
  await page.getByLabel('Password', {exact: true}).fill('garden-test-password');
  await button(page, 'Create account').click();
  await expect(page.getByRole('status')).toHaveText('Check your email for confirmation.');
});

test('adds, groups, filters, edits and removes plants, including a saved photo', async ({page}) => {
  await openGarden(page);
  await signIn(page);
  await addMint(page, 'Porch mint', true);
  await addMint(page, 'Bed mint');
  const group = page.locator('.group-card');
  await expect(group).toContainText('2 plants');
  await page.locator('#plantFilter').selectOption('Fruit');
  await expect(group).toHaveCount(0);
  await page.locator('#plantFilter').selectOption('Herb');
  const search = page.getByPlaceholder('Search plants');
  await search.fill('Porch mint');
  await expect(group.getByText('Porch mint')).toBeVisible();
  await button(group, 'Hide −').click();
  await expect(group.getByText('Porch mint')).toHaveCount(0);
  await button(group, 'View +').click();
  await group.getByRole('button', {name: 'Details'}).click();
  await expect(page.getByRole('img', {name: 'Plant photo'})).toHaveAttribute('src', /^data:image\/png/);
  await button(page, 'Edit details').click();
  await dialog(page).getByLabel('Nickname').fill('Kitchen mint');
  await button(dialog(page), 'Save changes').click();
  await expect(page.getByRole('heading', {name: 'Kitchen mint'})).toBeVisible();
  await nav(page, 'My Garden');
  await search.clear();
  await group.getByRole('button', {name: 'Edit group'}).click();
  await dialog(page).getByLabel('Variety').fill('Garden mint');
  await button(dialog(page), 'Save group changes').click();
  await expect(group).toContainText('Garden mint');
  await button(group, 'View +').click();
  const member = group.locator('.group-member').filter({hasText: 'Kitchen mint'});
  await member.getByRole('button', {name: /^Remove/}).click();
  await button(dialog(page), 'Remove').click();
  await expect(group).toContainText('1 plants');
  await group.getByRole('button', {name: 'Remove group'}).click();
  await button(dialog(page), 'Remove').click();
  await expect(group).toHaveCount(0);
  await expect(saveStatus(page)).toHaveText('Saved');
  await page.reload();
  await nav(page, 'My Garden');
  await expect(group).toHaveCount(0);
});

test('links a journal entry to a plant and preserves it after removal', async ({page}) => {
  await openGarden(page, {plants: [testPlant]});
  await signIn(page);
  await nav(page, 'My Garden');
  await button(page, 'View +').click();
  await page.getByRole('button', {name: 'Details'}).click();
  await button(page, 'Add observation').click();
  await expect(dialog(page).getByLabel('Plant')).toHaveValue('1');
  await dialog(page).getByRole('textbox', {name: 'Observation', exact: true}).fill('   ');
  await button(dialog(page), 'Save observation').click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole('textbox', {name: 'Observation', exact: true}).fill('New leaves after rain');
  await button(dialog(page), 'Save observation').click();
  await expect(page.getByText('New leaves after rain')).toBeVisible();
  await button(page.locator('.detail-actions'), 'Remove').click();
  await button(dialog(page), 'Remove').click();
  await expect(saveStatus(page)).toHaveText('Saved');
  await page.reload();
  await nav(page, 'Garden Journal');
  await expect(page.getByText('New leaves after rain')).toBeVisible();
});

test('creates, completes and reopens a task across reloads', async ({page}) => {
  await openGarden(page);
  await signIn(page);
  await nav(page, 'Garden Planner');
  await page.getByRole('button', {name: 'Add task'}).click();
  await dialog(page).getByLabel('Task', {exact: true}).fill('Water mint');
  await dialog(page).getByLabel('Notes').fill('Check the soil first');
  await button(dialog(page), 'Add task').click();
  await page.getByRole('checkbox', {name: 'Mark done'}).click();
  await page.getByRole('button', {name: 'Completed (1)'}).click();
  await expect(page.getByText('Water mint')).toBeVisible();
  await expect(saveStatus(page)).toHaveText('Saved');
  await page.reload();
  await nav(page, 'Garden Planner');
  await page.getByRole('button', {name: 'Completed (1)'}).click();
  await page.getByRole('checkbox', {name: 'Reopen'}).click();
  await page.getByRole('button', {name: 'Upcoming (1)'}).click();
  await expect(page.getByText('Water mint')).toBeVisible();
});

test('retains completed care when its plant is removed', async ({page}) => {
  await openGarden(page, {plants: [testPlant], tasks: [
    {id: 1, title: 'Watered mint', plant: 'Mint', done: true, completedAt: '2026-11-27T00:00:00Z'},
    {id: 2, title: 'Prune mint', plant: 'Mint', done: false},
  ]});
  await signIn(page);
  await nav(page, 'My Garden');
  await page.getByRole('button', {name: 'Remove group'}).click();
  await button(dialog(page), 'Remove').click();
  await nav(page, 'Garden Planner');
  await expect(page.getByText('No upcoming tasks.')).toBeVisible();
  await page.getByRole('button', {name: 'Completed (1)'}).click();
  await expect(page.getByText('Watered mint')).toBeVisible();
});

test('keeps unsaved edits when a save fails and retries before sign-out', async ({page}) => {
  const backend = await openGarden(page);
  await signIn(page);
  backend.rejectSaves(true);
  await addMint(page, 'Recoverable mint');
  await expect(saveStatus(page)).toContainText('Save failed');
  await button(page, 'Sign out').click();
  await expect.poll(backend.rejectedWrites).toBe(2);
  await expect(saveStatus(page)).toContainText('Save failed');
  await expect(account(page)).toBeVisible();
  backend.rejectSaves(false);
  await button(page, 'Sign out').click();
  await expect(button(page, 'Sign in')).toBeVisible();
  await signIn(page);
  await nav(page, 'My Garden');
  await button(page, 'View +').click();
  await expect(page.getByText('Recoverable mint')).toBeVisible();
});

for (const [name, settings, status, daily] of [
  ['primary forecast', {}, 'Live forecast · Open-Meteo', true],
  ['National Weather Service fallback', {primary: false, backup: true}, 'Live forecast · National Weather Service', true],
  ['both providers unavailable', {primary: false}, 'Live forecast unavailable', false],
]) {
  test('weather displays ' + name, async ({page}) => {
    await openGarden(page, settings);
    await signIn(page);
    await expect(page.locator('.weather-box').getByRole('status')).toContainText(status);
    await expect(page.locator('.forecast-day')).toHaveCount(daily ? 1 : 0);
    if (daily) await expect(page.locator('.forecast-day')).toContainText('75% chance');
  });
}

test('mobile plant dialog fits the viewport and can save via touch-sized layout', async ({page}) => {
  await page.setViewportSize({width: 390, height: 740});
  await openGarden(page);
  await signIn(page);
  await addMint(page, 'Mobile mint');
  await expect(page.getByRole('heading', {name: 'My Garden'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('copilot responds to suggested prompts and typed questions', async ({page}) => {
  await openGarden(page);
  await signIn(page);
  await nav(page, 'AI Copilot');
  await button(page, 'How do I prepare for frost?').click();
  await expect(page.locator('.bubble.bot')).toHaveCount(2);
  await page.getByPlaceholder('Ask about your garden').fill('How often should I water?');
  await button(page, 'Send').click();
  await expect(page.locator('.bubble.user').last()).toHaveText('How often should I water?');
  await expect(page.locator('.bubble.bot')).toHaveCount(3);
});

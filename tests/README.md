# GardenWise end-to-end tests

Run against the production React build with Chromium.

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

The suite intercepts Supabase and weather requests. Each test starts with separate test data and never writes to the live garden.

| Case | Expected result |
| --- | --- |
| Sign-in, password toggle, refresh and sign-out | Invalid credentials are rejected, the password toggle works, refresh restores the session, and sign-out returns to the login screen. |
| Sign-up | The app asks the user to confirm their email. Email delivery requires a separate live check. |
| Plant management | Add plants with an optional photo, search and filter them, collapse groups, change an individual and a group, then remove both. |
| Journal | Blank entries are rejected. A plant-linked observation survives removal of its plant and a reload. |
| Planner | Create, complete, reload and reopen a task. |
| Care history | Removing a plant removes its upcoming care tasks and preserves completed care. |
| Failed save | The app keeps unsaved changes and retries the write when signing out. |
| Weather | Open-Meteo renders forecast data. National Weather Service takes over when the first provider fails. When both fail, the app shows an unavailable state. |
| Mobile | The plant editor can save at a 390 px viewport without horizontal overflow. |
| Copilot | Both a suggested prompt and typed input produce a sample response. |

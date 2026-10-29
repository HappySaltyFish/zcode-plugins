# Task validator — classroom fixture

This small, authored sample demonstrates a newcomer task, not a production app.
The quick-start intentionally omits the Node version; compare package.json before drafting a documentation fix.

Run the regular checks with `npm test`. No dependency installation is needed.
`npm run test:failure` deliberately fails; `npm run test:slow` deliberately waits.
Neither command should be reported as successful without execution evidence.

Read `src/validate.mjs`, then `test/validate.test.mjs`.

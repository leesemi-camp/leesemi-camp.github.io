# Coverage Baseline (Playwright)

## Latest run

Date: 2026-04-27
Command: npm run test:coverage
Project: Chromium-Coverage

Coverage summary (monocart-reporter):

| Metric | Coverage % | Covered | Uncovered | Total |
| --- | --- | --- | --- | --- |
| Bytes | 49.28% | 164,870 | 169,697 | 334,567 |
| Statements | 41.89% | 1,858 | 2,577 | 4,435 |
| Branches | 34.81% | 1,285 | 2,407 | 3,692 |
| Functions | 54.47% | 280 | 234 | 514 |
| Lines | 44.59% | 4,508 | 5,603 | 10,111 |

Test summary:

- Tests: 74
- Passed: 74
- Failed: 0
- Duration: 5m 1s
- Playwright: v1.58.2

Test files:

| File | Tests |
| --- | --- |
| smoke.spec.js | 5 |
| spot-list.spec.js | 1 |
| static-pages.spec.js | 2 |
| helpers.unit.spec.js | 9 |
| api-files.spec.js | 3 |
| spot-list-rendering.spec.js | 20 |
| launcher-states.spec.js | 7 |
| map-edit-panel.spec.js | 9 |
| photo-interactions.spec.js | 9 |
| firestore-offline.spec.js | 5 |
| ui-button-interactions.spec.js | 5 |

---

## Original baseline

Date: 2026-04-27

| Metric | Coverage % | Covered | Uncovered | Total |
| --- | --- | --- | --- | --- |
| Bytes | 32.40% | 108,406 | 226,161 | 334,567 |
| Statements | 28.05% | 1,244 | 3,191 | 4,435 |
| Branches | 21.78% | 804 | 2,888 | 3,692 |
| Functions | 34.63% | 178 | 336 | 514 |
| Lines | 29.32% | 2,965 | 7,146 | 10,111 |

- Tests: 15, Passed: 15

Coverage artifacts:

- coverage/index.html
- coverage/index.json
- coverage/lcov.info
- coverage/coverage-data.js

To refresh this baseline, re-run: npm run test:coverage

# @xata.io/api

## 0.1.6

### Patch Changes

- [#2830](https://github.com/xataio/frontend/pull/2830) [`43b330b`](https://github.com/xataio/frontend/commit/43b330b14aec26f550403f31f44fc6523a1e4613) Thanks [@xata-bot](https://github.com/xata-bot)! - [Generated] Update API handlers ([#2830](https://github.com/xataio/frontend/issues/2830))

## 0.1.5

### Patch Changes

- [#2807](https://github.com/xataio/frontend/pull/2807) [`dc83a3a`](https://github.com/xataio/frontend/commit/dc83a3a6bd6594297b7b30484eb98619368dcc6b) Thanks [@SferaDev](https://github.com/SferaDev)! - Expose the retry policy (`isRetryableError`, `retryDelayMs`, `DEFAULT_RETRY`) from a new `@xata.io/api/retry` entry point, so callers that own their own retry loop can reuse it instead of restating the status list

## 0.1.4

### Patch Changes

- [#2800](https://github.com/xataio/frontend/pull/2800) [`fd5e19d`](https://github.com/xataio/frontend/commit/fd5e19dfaa8ca7f1f1e1e625bf9b8e0d159eca97) Thanks [@xata-bot](https://github.com/xata-bot)! - [Generated] Update API handlers

## 0.1.3

### Patch Changes

- [#2791](https://github.com/xataio/frontend/pull/2791) [`1fa4631`](https://github.com/xataio/frontend/commit/1fa4631f136e732552992a00b60c1432169891f8) Thanks [@xata-bot](https://github.com/xata-bot)! - [Generated] Update API handlers

- Updated dependencies [[`1f293c7`](https://github.com/xataio/frontend/commit/1f293c757466694db1230de63202b96aa96da560)]:
  - @xata.io/lang@0.0.3

## 0.1.2

### Patch Changes

- [#2778](https://github.com/xataio/frontend/pull/2778) [`6244a15`](https://github.com/xataio/frontend/commit/6244a1503b1ffd156c9673f42436778614365c8c) Thanks [@SferaDev](https://github.com/SferaDev)! - Publish the internal package versions required by the public xataio/cli mirror build.

- Updated dependencies [[`6244a15`](https://github.com/xataio/frontend/commit/6244a1503b1ffd156c9673f42436778614365c8c)]:
  - @xata.io/lang@0.0.2

## 0.1.1

### Patch Changes

- [#2557](https://github.com/xataio/frontend/pull/2557) [`24ae41b`](https://github.com/xataio/frontend/commit/24ae41b1d8e94d3ceb278609e627876ac90bbb12) Thanks [@SferaDev](https://github.com/SferaDev)! - Capture the `x-request-id` response header on `ApiError` (as `requestId`, and appended to the error message) so failed API calls are traceable in support; add an optional `retry` option to `XataApi` to opt out of client-level retries.

## 0.1.0

### Minor Changes

- [#935](https://github.com/xataio/frontend/pull/935) [`cefc03a`](https://github.com/xataio/frontend/commit/cefc03abc73c567df01aaa004d5fc6d683eac090) Thanks [@SferaDev](https://github.com/SferaDev)! - Move pgroll and pgstream to their own libraries

## 0.0.4

### Patch Changes

- [#864](https://github.com/xataio/frontend/pull/864) [`3fc20dc`](https://github.com/xataio/frontend/commit/3fc20dc7a90929af9d7ed73c0a7068ffd7817412) Thanks [@SferaDev](https://github.com/SferaDev)! - Fix casing of apiKeys namespace

## 0.0.3

### Patch Changes

- [#809](https://github.com/xataio/frontend/pull/809) [`8b56062`](https://github.com/xataio/frontend/commit/8b56062007fb9c1c209d37f79b520aa35fd7aa92) Thanks [@SferaDev](https://github.com/SferaDev)! - Handle token refreshes from the API client

## 0.0.2

### Patch Changes

- Updated dependencies [[`e1012e2`](https://github.com/xataio/frontend/commit/e1012e2cf7898c9ba9be998cc42c753ad8cf6561)]:
  - @xata.io/lang@0.0.1

## 0.0.1

### Patch Changes

- [#773](https://github.com/xataio/frontend/pull/773) [`1f04f9f`](https://github.com/xataio/frontend/commit/1f04f9fefcc4d37492b029a0190358bb8447a95c) Thanks [@SferaDev](https://github.com/SferaDev)! - Publish to npm

# @xata.io/api

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

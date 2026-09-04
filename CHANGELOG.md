# @xata.io/api

## 0.1.12

### Patch Changes

- [#3046](https://github.com/xataio/frontend/pull/3046) [`071b30f`](https://github.com/xataio/frontend/commit/071b30fa31270fbb17b29f7f48d3b1a2965dfa63) Thanks [@xata-bot](https://github.com/xata-bot)! - [Generated] Update API handlers ([#3046](https://github.com/xataio/frontend/issues/3046))

## 0.1.11

### Patch Changes

- [#3007](https://github.com/xataio/frontend/pull/3007) [`f2640fc`](https://github.com/xataio/frontend/commit/f2640fc9f0f0f684ce0612c276c872be6420762f) Thanks [@xata-bot](https://github.com/xata-bot)! - [Generated] Update API handlers ([#3007](https://github.com/xataio/frontend/issues/3007))

- [#3010](https://github.com/xataio/frontend/pull/3010) [`4da30cc`](https://github.com/xataio/frontend/commit/4da30cc7a40305104e796ae1b1cea850d69ceca7) Thanks [@xata-bot](https://github.com/xata-bot)! - [Generated] Update API handlers ([#3010](https://github.com/xataio/frontend/issues/3010))

- [#3012](https://github.com/xataio/frontend/pull/3012) [`5b63893`](https://github.com/xataio/frontend/commit/5b638934a813155c899defbb251cebc9ebcff185) Thanks [@xata-bot](https://github.com/xata-bot)! - Remove invite link

## 0.1.10

### Patch Changes

- [#2970](https://github.com/xataio/frontend/pull/2970) [`2054627`](https://github.com/xataio/frontend/commit/2054627b2a2bcb6df998acb9bcda439b8cf473c0) Thanks [@xata-bot](https://github.com/xata-bot)! - [Generated] Update API handlers ([#2970](https://github.com/xataio/frontend/issues/2970))

- [#2491](https://github.com/xataio/frontend/pull/2491) [`4c5d294`](https://github.com/xataio/frontend/commit/4c5d294e2cb8d05b1e3c60c8cd7e239c271e2477) Thanks [@SferaDev](https://github.com/SferaDev)! - Generate the API client with kubb v5. Every operation function keeps its name and signature; the
  per-operation `*Query`/`*Mutation` aggregate types are gone, the success response type is now the
  2xx status type (`GetBranchCredentials200`), enum type aliases drop the `Key` suffix
  (`BranchStatusStatusTypeEnumKey` becomes `BranchStatusStatusTypeEnum`), and the zod schemas type
  date/time fields as `z.iso.datetime()` strings instead of `z.date()`.

- [#2890](https://github.com/xataio/frontend/pull/2890) [`1d279b5`](https://github.com/xataio/frontend/commit/1d279b5b132c2c6dfc1eae14fc90c6792ae46fdc) Thanks [@SferaDev](https://github.com/SferaDev)! - [CLI]: Recover from expired sessions

## 0.1.9

### Patch Changes

- [#2956](https://github.com/xataio/frontend/pull/2956) [`8d1e720`](https://github.com/xataio/frontend/commit/8d1e72045b44d8a8d4c46794468bd4c9761b0f74) Thanks [@xata-bot](https://github.com/xata-bot)! - [Generated] Update API handlers ([#2956](https://github.com/xataio/frontend/issues/2956))

- [#2946](https://github.com/xataio/frontend/pull/2946) [`e82783c`](https://github.com/xataio/frontend/commit/e82783cfdf40783225a36ba2a572ed6d2db409aa) Thanks [@xata-bot](https://github.com/xata-bot)! - [Generated] Update API handlers ([#2946](https://github.com/xataio/frontend/issues/2946))

## 0.1.8

### Patch Changes

- [#2873](https://github.com/xataio/frontend/pull/2873) [`dbb03c4`](https://github.com/xataio/frontend/commit/dbb03c4f5f856afd4e08450a8bebee4363fad733) Thanks [@xata-bot](https://github.com/xata-bot)! - [Webapp|Website]: Upgrade to Next.js 16.3 and drop the TypeScript dual-alias ([#2869](https://github.com/xataio/frontend/issues/2869))

- [#2879](https://github.com/xataio/frontend/pull/2879) [`d102803`](https://github.com/xataio/frontend/commit/d102803c1eb3eb10f38f57935f2eeb57066a8a74) Thanks [@xata-bot](https://github.com/xata-bot)! - [Generated] Update API handlers ([#2879](https://github.com/xataio/frontend/issues/2879))

- [#2874](https://github.com/xataio/frontend/pull/2874) [`81a100d`](https://github.com/xataio/frontend/commit/81a100d389a654e6522c2e72a7e9ce74120d4d12) Thanks [@SferaDev](https://github.com/SferaDev)! - [API]: Validate XataApi options ([#2874](https://github.com/xataio/frontend/issues/2874))

## 0.1.7

### Patch Changes

- Updated dependencies [[`4daa313`](https://github.com/xataio/frontend/commit/4daa313cbb193d695b569b3d58b04be1b41067fc)]:
  - @xata.io/lang@0.0.4

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

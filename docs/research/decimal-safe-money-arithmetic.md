# Decimal-Safe Money Arithmetic

Research for [NORTE issue #24](https://github.com/dieguit/norte-app/issues/24), completed 2026-08-15.

## Recommendation

Use **`bignumber.js`** for the shared decimal calculation boundary, with canonical money strings parsed as strings and results serialized with `toFixed` or `toString` as appropriate.

It is the smallest option evaluated that combines:

- arbitrary-precision decimal arithmetic from string inputs;
- immutable, chainable values;
- explicit per-call decimal-place rounding via `decimalPlaces(dp, rm)`;
- the rounding modes needed for financial policies, including `ROUND_HALF_UP`, `ROUND_HALF_EVEN`, `ROUND_DOWN`, `ROUND_CEIL`, and `ROUND_FLOOR`;
- first-party TypeScript declarations;
- an ESM entry point and no runtime dependencies.

The important fit is `decimalPlaces(scale, roundingMode)`: allocation code can calculate an exact or high-precision share and choose the rounding policy at the call site, rather than mutating a shared global configuration. Keep allocation itself as a pure function that explicitly assigns any residual units according to a documented deterministic order, then assert that allocated values sum to the original amount.

`big.js` remains a valid smaller-runtime alternative if the project accepts constructor-level division configuration and wraps it behind one carefully controlled money module. It is not the recommendation for variable-scale allocation because its division precision and rounding mode are configured through `Big.DP` and `Big.RM`, even though its `round(dp, rm)` method accepts an explicit rounding mode.

## Requirements Applied

- Parse canonical decimal strings without passing through JavaScript `number` values.
- Keep intermediate financial arithmetic exact where possible; round only at an explicit domain boundary.
- Make allocation rounding deterministic and testable, including ties and negative values if supported by the domain.
- Preserve pure calculations: no reliance on ambient mutable configuration and no implicit conversion to `number`.
- Use a browser-compatible ESM package with minimal runtime and bundle cost.

## Options Compared

| Option | Decimal-string/API fit | Rounding and allocation fit | Runtime and TypeScript | Assessment |
| --- | --- | --- | --- | --- |
| [`bignumber.js` 11.1.5](https://www.npmjs.com/package/bignumber.js) | Constructor accepts strings; values are immutable; arithmetic is chainable; `toFixed` always emits normal notation. | `decimalPlaces(dp, rm)` takes decimal places and an optional per-call rounding mode. Exact add/subtract/multiply are documented; division uses configured precision and mode. Nine rounding modes and `integerValue(rm)` are available. | 8 KB minified and gzipped per the official README; zero dependencies; ESM/CJS/browser builds; built-in declaration files. | **Recommended.** Best balance of explicit rounding, TS ergonomics, and small runtime. |
| [`big.js` 7.0.1](https://www.npmjs.com/package/big.js) | Constructor accepts decimal strings; `Big.strict = true` rejects primitive numbers; immutable values; `toFixed` emits fixed notation. | `round(dp, rm)` is explicit, with four modes including half-up and half-even. However, division uses constructor-level `DP` and `RM`; separate constructors can isolate policies, but scale-varying pure operations need extra care. | Only 6 KB minified per the official README; zero dependencies; ESM file; TypeScript types are supplied by the separate `@types/big.js` package. | Smallest runtime and simplest API, but weaker fit for per-operation deterministic division policy. |
| [`decimal.js` 10.6.0](https://www.npmjs.com/package/decimal.js) | Constructor accepts strings; immutable values; `toFixed` and `toDecimalPlaces` are available; built-in TypeScript declarations. | Supports nine rounding modes and per-constructor precision. Its defining behavior is significant-digit precision with all calculations rounded to that precision, not just division. This is more policy surface than fixed-scale money arithmetic needs. | Zero dependencies; ESM/browser builds; larger than `big.js` and `bignumber.js` because it includes trigonometric and other non-money operations. | Safe, capable, and maintained, but unnecessary for this model. |

The size figures are not perfectly apples-to-apples: the `big.js` README says “6 KB minified,” while the `bignumber.js` README says “8 KB minified and gzipped.” They establish the intended relative tradeoff from the maintainers, not a local bundle measurement. A later implementation should verify the actual Vite production chunk after importing the selected entry point.

## API and Rounding Details

### `bignumber.js`

The official API documents string construction, immutable operations, and `toFixed(dp, rm)` for fixed-point output. `decimalPlaces(dp, rm)` returns a value rounded to a maximum number of decimal places, accepting a per-call rounding mode. The documented modes map cleanly to common money policies:

- `ROUND_DOWN`: toward zero, useful for truncation;
- `ROUND_HALF_UP`: ties away from zero, common for displayed currency rounding;
- `ROUND_HALF_EVEN`: ties toward the even neighbor, useful when required by an accounting policy;
- `ROUND_CEIL` and `ROUND_FLOOR`: directional policies.

The library documents addition, subtraction, and multiplication as exact, while division, square root, and negative powers use `DECIMAL_PLACES` and `ROUNDING_MODE`. Therefore, allocation should either divide with an explicitly configured high enough working precision or use an integer-unit strategy where the domain allows it, then round each result with `decimalPlaces(scale, mode)`. The final residual assignment remains application policy, not a feature supplied by the decimal library.

Set `STRICT: true` if accepting arbitrary inputs at the arithmetic boundary. Even with strict mode, the money API should expose strings and avoid `toNumber`; `toFixed` is the serialization boundary for fixed-scale canonical values.

### `big.js`

The official API documents exact arithmetic except division, square root, and negative powers. `round(dp, rm)` supports explicit decimal places and four modes: down, half-up, half-even, and up. `Big.strict = true` rejects primitive numbers and rejects imprecise conversion back to numbers.

Its limitation for this decision is configuration: division uses `Big.DP` and `Big.RM`, and the docs describe those as constructor properties. The library supports independent constructors via `Big()`, so a fixed policy can be isolated, but a generic allocation function with caller-selected scale and rounding policy must manage constructors or working precision itself. That is additional state and test surface for little runtime savings.

### `decimal.js`

The official API documents `toDecimalPlaces(dp, rm)`, nine rounding modes, immutable values, and independent cloned constructors. However, the library rounds all operation results to a configured number of **significant digits**. That behavior is useful for scientific/general decimal work, but money calculations normally need exact intermediate addition/multiplication followed by an explicit fixed-scale rounding boundary. `decimal.js` also includes trigonometric, logarithmic, and other functions that are outside the money model and make it larger than the lighter alternatives.

## Bundle and Runtime Considerations

- All three evaluated packages have zero runtime dependencies and document browser-compatible loading.
- `bignumber.js` publishes ESM, CommonJS, and browser builds and includes declarations in the package.
- `big.js` publishes a small ESM file, but TypeScript declarations come from `@types/big.js`, adding a separate development dependency and another version to track.
- `decimal.js` publishes ESM and declarations, but its broader API is unnecessary code for this use case.
- None of these libraries should be imported from UI modules merely for formatting. Keep arithmetic in the shared/domain boundary so bundlers can avoid pulling it into unrelated routes where possible.
- Measure the actual production bundle after implementation. Official README size claims are useful comparisons, not a substitute for the app's built chunk and compression settings.

## Test Implications

The eventual implementation should add focused pure-function tests, not tests of the vendor library itself:

- canonical decimal strings remain exact across addition, subtraction, multiplication, and division;
- no arithmetic path accepts or produces a JavaScript `number` for money;
- fixed-scale serialization never emits exponential notation;
- half-up, half-even, down, ceil, and floor behavior are pinned with positive and negative tie cases where supported;
- allocation preserves the invariant `sum(parts) === total` in decimal value and assigns any residual deterministically by documented index/key order;
- repeated calls with the same inputs are identical and do not depend on prior calls or global configuration;
- invalid strings, division by zero, non-finite values, and scale/rounding-policy violations fail at the boundary;
- large canonical strings and values with more fractional digits than the display scale are covered;
- TypeScript tests verify the chosen ESM import and the wrapper's string-only public API.

## Primary Sources

- [`bignumber.js` official README/source](https://github.com/MikeMcl/bignumber.js), including features, package builds, string construction, exact-operation claims, and test/typecheck commands.
- [`bignumber.js` official API](https://mikemcl.github.io/bignumber.js/), especially [`decimalPlaces`](https://mikemcl.github.io/bignumber.js/#decimalPlaces), [`toFixed`](https://mikemcl.github.io/bignumber.js/#toFix), rounding modes, and configuration.
- [`bignumber.js` package metadata](https://raw.githubusercontent.com/MikeMcl/bignumber.js/v11.1.5/package.json), including ESM exports, declaration files, files included, and dependency metadata.
- [`big.js` official README/source](https://github.com/MikeMcl/big.js), including size, strict mode, exact-operation claims, and TypeScript guidance.
- [`big.js` official API](https://mikemcl.github.io/big.js/), especially [`round`](https://mikemcl.github.io/big.js/#round), `DP`, `RM`, strict mode, and independent constructors.
- [`big.js` package metadata](https://raw.githubusercontent.com/MikeMcl/big.js/v7.0.1/package.json), including ESM exports and zero runtime dependencies.
- [`decimal.js` official README/source](https://github.com/MikeMcl/decimal.js), including significant-digit semantics, broader API, ESM, and TypeScript declarations.
- [`decimal.js` official API](https://mikemcl.github.io/decimal.js/), especially [`toDecimalPlaces`](https://mikemcl.github.io/decimal.js/#toDP), precision, rounding modes, and cloned constructors.
- [`decimal.js` package metadata](https://raw.githubusercontent.com/MikeMcl/decimal.js/v10.6.0/package.json), including ESM exports, declaration files, and zero runtime dependencies.

# Add Security-Validation CI Workflow

This PR adds a new GitHub Actions workflow that enforces security validation standards across our codebase. The workflow runs on every PR and can be manually triggered.

## Features

- Runs on PR and manual dispatch
- Validates test coverage (90% threshold)
- Checks for skipped validation tests
- Posts results via Bug Bot
- Caches pnpm for fast runs

## Example Runs

### ✅ Successful Run (90% threshold)
Branch: `feat/ci-security-gate`
- All tests pass
- Coverage above 90%
- No skipped validation tests
- Runtime: ~2 minutes

### ❌ Failed Run (95% threshold)
Branch: `example/security-validation-fail`
- Tests pass
- Coverage below 95% threshold
- Bug Bot posts detailed coverage report
- Shows how the gate prevents merging of inadequately tested code

## Implementation Details

1. `.github/workflows/validate.yml`: Main workflow configuration
2. `scripts/checkCoverage.js`: Coverage validation script
3. Package.json: Added CI scripts
4. README.md: Added workflow badge and documentation

## Testing Instructions

1. View the workflow run on this PR
2. Check the example failure branch
3. Review Bug Bot comments on both runs

## Screenshots

### Success Run
[Will be added by Bug Bot]

### Failure Run
[Will be added by Bug Bot] 
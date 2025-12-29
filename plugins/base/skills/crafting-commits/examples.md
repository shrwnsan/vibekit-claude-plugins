# Commit Message Examples

This reference provides detailed commit message examples for various change types. Use these as templates when crafting your commit messages.

## Feature Addition

```
feat: add user authentication system with JWT tokens

Implement secure user authentication using JSON Web Tokens with
password hashing, session management, and token refresh mechanisms.

Changes:
- Add login/logout endpoints with password validation
- Implement JWT token generation and verification
- Add user registration with email confirmation
- Include session timeout and refresh token logic

Fixes #123
Related to #45

Co-Authored-By: GLM <zai-org@users.noreply.github.com>
```

## Bug Fix

```
fix: resolve memory leak in data processing pipeline

Fix memory allocation issue in batch processing where temporary
objects were not properly garbage collected after large dataset
operations.

Root cause: Missing cleanup in finally block of processBatch()
function causing cumulative memory usage over time.

Testing: Verified memory usage remains stable during 24h stress test
with 1M+ records processed.

Fixes #89
Co-Authored-By: GLM <zai-org@users.noreply.github.com>
```

## Documentation Update

```
docs: update API documentation with new authentication endpoints

Add comprehensive documentation for the new JWT-based authentication
system including request/response examples, error codes, and
integration patterns.

Updated sections:
- Authentication overview and flow diagrams
- Endpoint specifications with curl examples
- Error handling and troubleshooting guide
- Integration examples for popular frameworks

Related to feature implementation in commit 7a2b3c4
Co-Authored-By: GLM <zai-org@users.noreply.github.com>
```

## Refactoring

```
refactor: simplify data validation logic with chainable validators

Replace complex nested validation functions with a more elegant
chainable validator pattern that improves readability and reduces
code duplication.

Benefits:
- Cleaner API with method chaining
- Easier to add new validation rules
- Better error message aggregation
- Reduced cognitive complexity in validation logic

Performance impact: Minimal (<1ms per validation)
Co-Authored-By: GLM <zai-org@users.noreply.github.com>
```

## Simple Changes

```
feat: add user profile page
fix: resolve null pointer exception
docs: update installation guide
style: format code with prettier
chore: update dependencies to latest versions
test: add unit tests for user service
```

## Complex Changes

For complex changes, include detailed body explaining:
- What was changed and why
- Breaking changes (if any)
- Testing performed
- Related issues or PRs
- Performance implications
- Migration considerations

## Collaborative Work

Always include Co-Authored-By lines when working with:
- AI models and assistants
- Multiple human contributors
- Code reviewers who provided significant input
- Pair programming sessions

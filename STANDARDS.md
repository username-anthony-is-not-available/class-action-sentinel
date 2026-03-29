# Project Standards

This document defines the quality, testing, and security thresholds for the
`class-action-sentinel` project.

## Code Quality

Ensuring high-quality code is essential for the maintainability and reliability
of the system.

- **Linting**: All code must pass linting without errors. We use project-specific
  linters (e.g., `eslint` for JavaScript/TypeScript, `markdownlint` for
  Markdown).
- **Formatting**: Consistent code formatting must be maintained using tools like
  `prettier`.
- **Documentation**: All complex logic must be documented with clear comments.
  Public APIs must have comprehensive documentation.
- **Clean Code**: No `console.log` or debug statements should remain in the
  production code. Error handling should be implemented appropriately.

## Testing

A robust testing suite is required to ensure system stability and prevent
regressions.

- **Unit Tests**: Mandatory for all new features and bug fixes. Aim for high
  coverage of core logic.
- **Integration Tests**: Required for components that interact with external
  services or other system parts.
- **E2E Tests**: Should be implemented for critical user paths to ensure the
  entire system works as expected.
- **Thresholds**:
  - Test coverage should meet or exceed 80% for new code.
  - All existing tests must pass before any change is merged.

## Security

Security is a top priority to protect the system and its users.

- **Secret Management**: Never commit secrets, API keys, or sensitive
  information to the repository. Use environment variables or a secure secret
  manager.
- **Dependency Scanning**: Regularly scan dependencies for known vulnerabilities
  and keep them updated.
- **Data Protection**: Ensure all sensitive data is handled securely and
  conforms to privacy regulations.
- **Code Review**: All changes must undergo a security-focused review to
  identify potential vulnerabilities.

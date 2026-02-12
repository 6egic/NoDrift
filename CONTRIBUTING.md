# Contributing to Nodrift

Thank you for your interest in contributing to Nodrift! This document provides guidelines and instructions for contributing.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/nodrift.git
   cd nodrift
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the project**
   ```bash
   npm run build
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Run linting**
   ```bash
   npm run lint
   ```

## Code Style

- **TypeScript**: Follow the existing code style
- **Linting**: We use ESLint - run `npm run lint` before committing
- **Formatting**: We use Prettier - run `npm run format` to format code
- **Type Safety**: All code must pass TypeScript strict mode checks

## Making Changes

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code patterns
   - Add comments for complex logic
   - Update documentation if needed

3. **Test your changes**
   ```bash
   npm run build
   npm test
   npm run lint
   ```

4. **Commit your changes**
   - Write clear commit messages
   - Follow conventional commit format when possible

5. **Submit a Pull Request**
   - Describe your changes clearly
   - Reference any related issues
   - Ensure all tests pass

## Testing

- Add tests for new features
- Ensure existing tests still pass
- Test with real RPC providers when possible
- Use mock mode for unit tests

## Documentation

- Update README.md for user-facing changes
- Update inline code comments for complex logic
- Add examples for new features

## Release Process

Releases are handled by maintainers. Version bumping follows semantic versioning:
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes

## Questions?

If you have questions, please open an issue on GitHub.


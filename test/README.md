# Test Suite

This directory contains unit tests for the LaTeX IDE project.

## Test Framework

- **Vitest**: Modern testing framework with Vite integration
- **jsdom**: Browser environment simulation for DOM testing
- **vi**: Mocking utilities for testing

## Test Structure

### Core Module Tests

- `SettingsManager.test.js` - Tests for application settings management
- `ShortcutManager.test.js` - Tests for keyboard shortcut handling
- `AgentPluginBase.test.js` - Tests for the agent plugin base class

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run coverage
```

## Test Coverage

The test suite covers:

- Settings management (get/set, import/export, shortcuts, plugins)
- Keyboard shortcut handling and conflict detection
- Agent plugin lifecycle and functionality
- Configuration management
- Error handling and logging
- Event system

## Adding New Tests

1. Create test files with `.test.js` extension
2. Import the module to test and testing utilities
3. Use `describe` blocks to group related tests
4. Use `beforeEach` for test setup
5. Mock external dependencies using `vi.fn()`
6. Write clear, descriptive test names

## Test Conventions

- Use descriptive test names that explain what is being tested
- Group related tests in `describe` blocks
- Set up clean state in `beforeEach` hooks
- Mock external dependencies and side effects
- Test both success and error cases
- Verify both behavior and state changes
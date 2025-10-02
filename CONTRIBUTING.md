# Contributing to Bottleneck

Thank you for your interest in contributing to Bottleneck! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)
- [Style Guide](#style-guide)

## Code of Conduct

Please be respectful and constructive in all interactions.

## Getting Started

1. **Fork the repository**
   ```bash
   gh repo fork yourusername/bottleneck --clone
   cd bottleneck
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development**
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or updates

Example: `feature/add-dark-mode`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

Examples:
```
feat(ui): add dark mode toggle
fix(auth): resolve token refresh issue
docs(readme): update installation instructions
```

### Development Commands

```bash
# Start dev environment
npm run dev

# Build application
npm run build

# Build for distribution
npm run dist

# Build for specific platform
npm run dist:win
npm run dist:mac
npm run dist:linux
```

## Pull Request Process

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, documented code
   - Add tests if applicable
   - Update documentation

3. **Test your changes**
   ```bash
   npm run build
   npm run start
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template
   - Submit for review

### PR Requirements

- ✅ Builds successfully
- ✅ No linter errors
- ✅ Tests pass (if applicable)
- ✅ Documentation updated
- ✅ Commit messages follow convention
- ✅ No merge conflicts

### PR Review Process

1. Automated checks run (build, tests)
2. Maintainer reviews code
3. Address feedback if needed
4. PR is merged or closed

## Release Process

Releases are automated through GitHub Actions. See [RELEASE.md](./RELEASE.md) for details.

### For Maintainers

1. **Create a release**
   ```bash
   node scripts/release.js
   ```

2. **Follow prompts**
   - Select version type
   - Confirm changes
   - Push to GitHub

3. **Monitor build**
   - Check GitHub Actions
   - Verify all platforms build
   - Test release artifacts

4. **Publish release**
   - Review draft release
   - Update release notes
   - Publish

See [RELEASE_QUICKSTART.md](./RELEASE_QUICKSTART.md) for quick start guide.

## Style Guide

### TypeScript

- Use TypeScript for all new code
- Define types for all functions
- Avoid `any` type when possible
- Use `interface` for object shapes

```typescript
// Good
interface User {
  id: number;
  name: string;
  email: string;
}

function getUser(id: number): Promise<User> {
  // ...
}

// Avoid
function getUser(id: any): any {
  // ...
}
```

### React

- Use functional components
- Use hooks for state management
- Keep components small and focused
- Use TypeScript for props

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};
```

### File Structure

```
src/
├── main/          # Main process (Node.js)
├── preload/       # Preload scripts
└── renderer/      # Renderer process (React)
    ├── components/
    ├── stores/
    ├── services/
    ├── utils/
    └── views/
```

### Naming Conventions

- **Files**: PascalCase for components, camelCase for utilities
  - `UserProfile.tsx`
  - `formatDate.ts`

- **Components**: PascalCase
  - `UserProfile`
  - `NavigationBar`

- **Functions**: camelCase
  - `getUserById()`
  - `formatTimestamp()`

- **Constants**: UPPER_SNAKE_CASE
  - `MAX_RETRY_ATTEMPTS`
  - `API_BASE_URL`

## Testing

### Manual Testing

1. Test on multiple platforms (Windows, macOS, Linux)
2. Test both development and production builds
3. Test common user workflows
4. Test error scenarios

### Automated Testing

*Coming soon*

## Documentation

- Update README.md for user-facing changes
- Update inline code comments
- Update RELEASE.md for release process changes
- Add examples for new features

## Getting Help

- 💬 [GitHub Discussions](https://github.com/yourusername/bottleneck/discussions)
- 🐛 [Issue Tracker](https://github.com/yourusername/bottleneck/issues)
- 📧 Email: team@bottleneck.dev

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Bottleneck! 🚀**

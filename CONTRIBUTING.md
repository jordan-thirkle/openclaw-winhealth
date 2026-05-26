# Contributing

Thanks for helping improve the Windows Health Monitor. Here's how to contribute.

## Getting Started

```bash
git clone https://github.com/jordan-thirkle/openclaw-winhealth.git
cd openclaw-winhealth
npm install
```

## Development

1. Make your changes to the `.js` files
2. Run `npm test` to verify all 27 tests pass
3. Test locally: `openclaw plugins install .`
4. Verify: `openclaw plugins inspect winhealth --runtime --json`
5. Submit a PR

## Code Style

- Use plain JavaScript (ESM, no build step required)
- Follow existing patterns in the codebase
- Keep tools focused — one tool per file
- Use `api.runtime.system.runCommandWithTimeout` for CLI commands
- Use `api.logger` for logging

## Testing

Before submitting:
1. Test on Windows 10/11 native
2. Run `openclaw plugins inspect winhealth --runtime --json`
3. Verify all three tools register correctly
4. Include reproduction steps for any issues

## Pull Request Process

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a PR with a clear description

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

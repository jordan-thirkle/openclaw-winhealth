# Contributing

Thanks for helping improve the OpenClaw Health Monitor. Here's how to contribute.

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
1. Run `npm test` to verify all 27 tests pass
2. Test on at least two platforms (Windows + Linux or macOS)
3. Run `openclaw plugins inspect winhealth --runtime --json` to verify tool registration
4. Verify the dashboard loads and shows live data when canvas is configured
5. Include reproduction steps for any issues

## Pull Request Process

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a PR with a clear description

The `dashboard/` directory contains static HTML assets that must be manually deployed to the canvas host root. Dashboard changes should be tested in conjunction with the canvas plugin before submitting.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

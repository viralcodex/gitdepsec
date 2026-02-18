# GitDepSec CLI

A powerful CLI tool for analyzing dependency vulnerabilities in your projects. Supports npm, PyPI, Maven, RubyGems, Composer, and Pub.

## Installation

```bash
# Using npm
npm install -g gitdepsec

# Using bun
bun add -g gitdepsec

# Or run without installing
bunx gitdepsec analyse
npx gitdepsec analyse
```

## Usage

### Analyze Local Project

```bash
# Analyze package.json in current directory
gds analyse

# Analyze specific file
gds analyse -f package.json
gds analyse -f requirements.txt
gds analyse -f pom.xml

# Analyze multiple files
gds analyse -f package.json -f requirements.txt
```

### Analyze GitHub Repository

```bash
# Public repository
gds analyse --repo owner/repo

# Specific branch
gds analyse --repo owner/repo --branch develop

# With GitHub token (for private repos or higher rate limits)
gds analyse --repo owner/repo --token ghp_xxxxx
```

### Output Formats

```bash
# Default: colored table output
gds analyse

# JSON output (for piping/scripting)
gds analyse --format json

# Markdown output
gds analyse --format markdown

# Save to file
gds analyse --output report.json --format json
```

### Include Transitive Dependencies

```bash
# Transitive scanning is enabled by default
gds analyse

# Disable transitive (direct dependencies only)
gds analyse --no-transitive
```

### Generate Fix Plan

```bash
# Generate fix recommendations
gds fix

# Fix specific file
gds fix -f package.json

# Direct dependencies only
gds fix --no-transitive

# Output as JSON
gds fix --format json
```

## Configuration

Create a `.gitdepsecrc` or `.gitdepsec.json` in your project root:

```json
{
  "github_token": "ghp_xxxxx",
  "include_transitive": true,
  "output_format": "table"
}
```

Or use environment variables:

```bash
export GITHUB_TOKEN=ghp_xxxxx
export GDS_INCLUDE_TRANSITIVE=true
export GDS_OUTPUT_FORMAT=table
```

## Commands

| Command | Description |
|---------|-------------|
| `gds analyse` | Analyze dependencies for vulnerabilities |
| `gds fix` | Generate fix recommendations |
| `gds init` | Create configuration file |
| `gds --version` | Show version |
| `gds --help` | Show help |

## CLI Options Reference

### `gds analyse`

| Option | Description |
|--------|-------------|
| `-f, --file <files...>` | Manifest file(s) to analyze |
| `-r, --repo <repo>` | GitHub repository in `owner/repo` format |
| `-b, --branch <branch>` | Branch to analyze |
| `-t, --token <token>` | GitHub personal access token |
| `--no-transitive` | Disable transitive dependency scanning |
| `--format <format>` | Output format: `table`, `json`, `markdown` |
| `-o, --output <file>` | Save output to file |
| `-q, --quiet` | Minimal output |
| `-v, --verbose` | Verbose output |

### `gds fix`

| Option | Description |
|--------|-------------|
| `-f, --file <files...>` | Manifest file(s) to generate fixes for |
| `-r, --repo <repo>` | GitHub repository in `owner/repo` format |
| `-b, --branch <branch>` | Branch to analyze |
| `-t, --token <token>` | GitHub personal access token |
| `--no-transitive` | Disable transitive dependency scanning |
| `--format <format>` | Output format: `table`, `json`, `markdown` |
| `-o, --output <file>` | Save output to file |

## Supported Ecosystems

- **npm** - `package.json`
- **PyPI** - `requirements.txt`
- **Maven** - `pom.xml`
- **RubyGems** - `Gemfile`
- **Composer** - `composer.json`
- **Pub** - `pubspec.yaml`

## Exit Codes

For `gds analyse`:

| Code | Description |
|------|-------------|
| 0 | Success, no vulnerabilities found |
| 1 | Vulnerabilities found |
| 2 | Error during analysis |

For `gds fix`:
- `0`: Fix plan generated
- `2`: Error during fix plan generation

## AI Harness Usage (Terminal)

Use the CLI directly from your AI harness/tool and consume structured JSON output.

```bash
# Analyze local manifests as JSON
gds analyse --format json

# Analyze a specific repo and save JSON output
gds analyse --repo owner/repo --format json --output report.json

# Generate fix plan as JSON
gds fix --format json
```

## License

MIT

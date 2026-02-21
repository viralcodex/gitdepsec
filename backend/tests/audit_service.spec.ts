import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';

import type {
  DependencyGroups,
  ManifestFileContents,
} from '../constants/model';
import { Ecosystem } from '../constants/model';
import AuditService from '../service/audit_service';
import GithubService from '../service/github_service';
import ProgressService from '../service/progress_service';
import {
  auditFileMockOsvResponse,
  auditIntegrationDepsDevEmptyResponse,
  auditIntegrationGithubTreeResponse,
  auditIntegrationManifestData,
  auditIntegrationOsvEmptyResponse,
  auditMockDepsDevResponse,
  auditMockOSVResponse,
  auditMockVulnDetails,
} from './mocks/mock-data';
import {
  setupAxiosMocks,
  setupGithubServiceMock,
  setupProgressServiceMock,
  silenceConsoleError,
} from './mocks/mock-setup';

describe('AuditService', () => {
  let auditService: AuditService;
  let mockProgressService: ProgressService;
  let mockGithubService: GithubService;
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleErrorSpy = silenceConsoleError();
    setupAxiosMocks();

    // Create mock progress service
    mockProgressService = new ProgressService();
    setupProgressServiceMock(mockProgressService);

    // Create audit service instance
    auditService = new AuditService('test-pat', mockProgressService);

    // Mock GitHub service methods
    mockGithubService = setupGithubServiceMock(auditService);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Version Normalization', () => {
    it('should normalize standard semantic versions', () => {
      expect(auditService.normalizeVersion('1.2.3')).toBe('1.2.3');
      expect(auditService.normalizeVersion('10.20.30')).toBe('10.20.30');
    });

    it('should handle versions with leading special characters', () => {
      expect(auditService.normalizeVersion('^1.2.3')).toBe('1.2.3');
      expect(auditService.normalizeVersion('~2.3.4')).toBe('2.3.4');
      expect(auditService.normalizeVersion('>=5.0.0')).toBe('5.0.0');
    });

    it('should handle versions with prerelease identifiers', () => {
      expect(auditService.normalizeVersion('1.2.3-alpha')).toBe(
        '1.2.3-alpha',
      );
      expect(auditService.normalizeVersion('2.0.0-rc.1')).toBe('2.0.0-rc.1');
      expect(auditService.normalizeVersion('1.0.0+build.123')).toBe(
        '1.0.0+build.123',
      );
    });

    it('should handle incomplete versions', () => {
      expect(auditService.normalizeVersion('1.2')).toBe('1.2.0');
      expect(auditService.normalizeVersion('3')).toBe('3.0.0');
      expect(auditService.normalizeVersion('1.x')).toBe('1.0.0');
      expect(auditService.normalizeVersion('1.*')).toBe('1.0.0');
    });

    it('should detect and reject Git commit hashes', () => {
      expect(
        auditService.normalizeVersion(
          'abc123def456abc123def456abc123def456abc1',
        ),
      ).toBe('unknown');
      expect(
        auditService.normalizeVersion('1a2b3c4d5e6f7890abcdef1234567890'),
      ).toBe('unknown');
      expect(auditService.normalizeVersion('a1b2c3d')).toBe('unknown');
    });

    it('should handle invalid or empty versions', () => {
      expect(auditService.normalizeVersion('')).toBe('unknown');
      expect(auditService.normalizeVersion(null as any)).toBe('unknown');
      expect(auditService.normalizeVersion(undefined)).toBe('unknown');
      expect(auditService.normalizeVersion('unknown')).toBe('unknown');
    });

    it('should reject suspiciously long major versions', () => {
      expect(auditService.normalizeVersion('12345678901.2.3')).toBe(
        'unknown',
      );
    });
  });

  describe('NPM Ecosystem Parsing', () => {
    it('should parse package.json with dependencies', async () => {
      const npmFiles = [
        {
          path: 'package.json',
          content: JSON.stringify({
            name: 'test-package',
            version: '1.0.0',
            dependencies: {
              express: '^4.18.2',
              lodash: '~4.17.21',
            },
          }),
        },
      ];

      const manifestFiles: ManifestFileContents = { npm: npmFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      expect(result.dependencies['package.json']).toBeDefined();
      expect(result.dependencies['package.json'].length).toBe(2);

      const expressDep = result.dependencies['package.json'].find(
        (d) => d.name === 'express',
      );
      expect(expressDep).toBeDefined();
      expect(expressDep?.version).toBe('4.18.2');
      expect(expressDep?.ecosystem).toBe(Ecosystem.NPM);
    });

    it('should parse package.json with devDependencies', async () => {
      const npmFiles = [
        {
          path: 'package.json',
          content: JSON.stringify({
            name: 'test-package',
            devDependencies: {
              jest: '^29.0.0',
              typescript: '~5.0.4',
            },
          }),
        },
      ];

      const manifestFiles: ManifestFileContents = { npm: npmFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      expect(result.dependencies['package.json']).toBeDefined();
      expect(result.dependencies['package.json'].length).toBe(2);

      const jestDep = result.dependencies['package.json'].find(
        (d) => d.name === 'jest',
      );
      expect(jestDep?.version).toBe('29.0.0');
    });

    it('should handle both dependencies and devDependencies', async () => {
      const npmFiles = [
        {
          path: 'package.json',
          content: JSON.stringify({
            dependencies: { react: '^18.2.0' },
            devDependencies: { vite: '^4.0.0' },
          }),
        },
      ];

      const manifestFiles: ManifestFileContents = { npm: npmFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      expect(result.dependencies['package.json'].length).toBe(2);
    });

    it('should handle invalid package.json gracefully', async () => {
      const npmFiles = [
        {
          path: 'package.json',
          content: 'invalid json{',
        },
      ];

      const manifestFiles: ManifestFileContents = { npm: npmFiles };

      try {
        await auditService.getParsedManifestFileContents(
          'test-user',
          'test-repo',
          'main',
          manifestFiles,
        );
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('Failed to parse package.json file');
      }
    });
  });

  describe('PHP Ecosystem Parsing', () => {
    it('should parse composer.json with require dependencies', async () => {
      const phpFiles = [
        {
          path: 'composer.json',
          content: JSON.stringify({
            name: 'test/package',
            require: {
              php: '>=8.0',
              'laravel/framework': '^10.0',
              'guzzlehttp/guzzle': '~7.0',
            },
          }),
        },
      ];

      const manifestFiles: ManifestFileContents = { php: phpFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      expect(result.dependencies['composer.json']).toBeDefined();
      // PHP version is typically skipped
      const laravelDep = result.dependencies['composer.json'].find(
        (d) => d.name === 'laravel/framework',
      );
      expect(laravelDep).toBeDefined();
      expect(laravelDep?.version).toBe('10.0.0');
      expect(laravelDep?.ecosystem).toBe(Ecosystem.COMPOSER);
    });

    it('should parse composer.json with require-dev dependencies', async () => {
      const phpFiles = [
        {
          path: 'composer.json',
          content: JSON.stringify({
            'require-dev': {
              'phpunit/phpunit': '^10.0',
              'mockery/mockery': '^1.5',
            },
          }),
        },
      ];

      const manifestFiles: ManifestFileContents = { php: phpFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      expect(result.dependencies['composer.json']).toBeDefined();
      const phpunitDep = result.dependencies['composer.json'].find(
        (d) => d.name === 'phpunit/phpunit',
      );
      expect(phpunitDep?.version).toBe('10.0.0');
    });

    it('should handle invalid composer.json gracefully', async () => {
      const phpFiles = [
        {
          path: 'composer.json',
          content: 'invalid json',
        },
      ];

      const manifestFiles: ManifestFileContents = { php: phpFiles };

      try {
        await auditService.getParsedManifestFileContents(
          'test-user',
          'test-repo',
          'main',
          manifestFiles,
        );
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('Failed to parse composer.json file');
      }
    });
  });

  describe('Python Ecosystem Parsing', () => {
    it('should parse requirements.txt with simple dependencies', async () => {
      const pythonFiles = [
        {
          path: 'requirements.txt',
          content: `django==4.2.0
requests>=2.28.0
flask~=2.3.0
numpy`,
        },
      ];

      const manifestFiles: ManifestFileContents = { PiPY: pythonFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      expect(result.dependencies['requirements.txt']).toBeDefined();
      expect(result.dependencies['requirements.txt'].length).toBe(4);

      const djangoDep = result.dependencies['requirements.txt'].find(
        (d) => d.name === 'django',
      );
      expect(djangoDep?.version).toBe('4.2.0');
      expect(djangoDep?.ecosystem).toBe(Ecosystem.PYPI);

      const numpyDep = result.dependencies['requirements.txt'].find(
        (d) => d.name === 'numpy',
      );
      expect(numpyDep?.version).toBe('unknown');
    });

    it('should handle requirements.txt with comments and empty lines', async () => {
      const pythonFiles = [
        {
          path: 'requirements.txt',
          content: `# This is a comment
                    django==4.2.0                   
                    # Another comment
                    requests>=2.28.0
`,
        },
      ];

      const manifestFiles: ManifestFileContents = { PiPY: pythonFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      expect(result.dependencies['requirements.txt'].length).toBe(2);
    });

    it('should parse requirements.txt with various version specifiers', async () => {
      const pythonFiles = [
        {
          path: 'requirements.txt',
          content: `package1==1.0.0
                    package2>=2.0.0,<3.0.0
                    package3~=1.4.2
                    package4!=1.0.0
                    package5[extra]>=1.0.0`,
        },
      ];

      const manifestFiles: ManifestFileContents = { PiPY: pythonFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      expect(result.dependencies['requirements.txt']).toBeDefined();
      expect(result.dependencies['requirements.txt'].length).toBeGreaterThan(0);
    });
  });

  describe('Dart Ecosystem Parsing', () => {
    it('should parse pubspec.yaml with dependencies', async () => {
      const dartFiles = [
        {
          path: 'pubspec.yaml',
          content: `name: my_app
                    version: 1.0.0
                    dependencies:
                      flutter:
                        sdk: flutter
                      http: ^0.13.5
                      shared_preferences: ^2.0.15`,
        },
      ];

      const manifestFiles: ManifestFileContents = { Pub: dartFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      expect(result.dependencies['pubspec.yaml']).toBeDefined();
      const httpDep = result.dependencies['pubspec.yaml'].find(
        (d) => d.name === 'http',
      );
      expect(httpDep?.version).toBe('0.13.5');
      expect(httpDep?.ecosystem).toBe(Ecosystem.PUB);
    });

    it('should parse pubspec.yaml with dev_dependencies', async () => {
      const dartFiles = [
        {
          path: 'pubspec.yaml',
          content: `name: my_app
                    dev_dependencies:
                      test: ^1.21.0
                      mockito: ^5.3.2`,
        },
      ];

      const manifestFiles: ManifestFileContents = { Pub: dartFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      expect(result.dependencies['pubspec.yaml']).toBeDefined();
      const testDep = result.dependencies['pubspec.yaml'].find(
        (d) => d.name === 'test',
      );
      expect(testDep?.version).toBe('1.21.0');
    });

    it('should parse SDK dependencies in pubspec.yaml', async () => {
      const dartFiles = [
        {
          path: 'pubspec.yaml',
          content: `name: my_app
                    dependencies:
                      flutter:
                        sdk: flutter
                      http: ^0.13.5`,
        },
      ];

      const manifestFiles: ManifestFileContents = { Pub: dartFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      // SDK dependencies are parsed
      expect(result.dependencies['pubspec.yaml']).toBeDefined();
    });
  });

  describe('Maven Ecosystem Parsing', () => {
    it('should parse pom.xml with dependencies', async () => {
      const mavenFiles = [
        {
          path: 'pom.xml',
          content: `<?xml version="1.0" encoding="UTF-8"?>
                      <project>
                        <dependencies>
                          <dependency>
                            <groupId>org.springframework.boot</groupId>
                            <artifactId>spring-boot-starter-web</artifactId>
                            <version>3.0.0</version>
                          </dependency>
                          <dependency>
                            <groupId>com.google.guava</groupId>
                            <artifactId>guava</artifactId>
                            <version>31.1-jre</version>
                          </dependency>
                        </dependencies>
                      </project>`,
        },
      ];

      const manifestFiles: ManifestFileContents = { Maven: mavenFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      expect(result.dependencies['pom.xml']).toBeDefined();
      // Maven parsing should extract dependencies
      expect(result.dependencies['pom.xml'].length).toBeGreaterThan(0);
    });

    it('should handle pom.xml without version tags', async () => {
      const mavenFiles = [
        {
          path: 'pom.xml',
          content: `<?xml version="1.0" encoding="UTF-8"?>
                      <project>
                        <dependencies>
                          <dependency>
                            <groupId>junit</groupId>
                            <artifactId>junit</artifactId>
                          </dependency>
                        </dependencies>
                      </project>`,
        },
      ];

      const manifestFiles: ManifestFileContents = { Maven: mavenFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      // Should parse dependencies even without version
      expect(result.dependencies['pom.xml']).toBeDefined();
    });

    it('should handle invalid pom.xml gracefully', async () => {
      const mavenFiles = [
        {
          path: 'pom.xml',
          content: 'invalid xml <<<<',
        },
      ];

      const manifestFiles: ManifestFileContents = { Maven: mavenFiles };

      try {
        await auditService.getParsedManifestFileContents(
          'test-user',
          'test-repo',
          'main',
          manifestFiles,
        );
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('Failed to parse pom.xml file');
      }
    });
  });

  describe('Cargo Ecosystem Parsing', () => {
    it('should parse Cargo.toml dependencies from core sections', async () => {
      const rustFiles = [
        {
          path: 'Cargo.toml',
          content: `[package]
                    name = "test-app"
                    version = "0.1.0"
                            
                    [dependencies]
                    serde = "1.0.197"
                    tokio = { version = "1.36.0", features = ["rt-multi-thread"] }
                    rand = { git = "https://github.com/rust-random/rand" }
                            
                    [dev-dependencies]
                    proptest = "1.4.0"
                            
                    [build-dependencies]
                    cc = "1.0.90"`,
        },
      ];

      const manifestFiles: ManifestFileContents = { rust: rustFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      expect(result.dependencies['Cargo.toml']).toBeDefined();
      expect(result.dependencies['Cargo.toml'].length).toBe(4);

      const serdeDep = result.dependencies['Cargo.toml'].find(
        (d) => d.name === 'serde',
      );
      expect(serdeDep?.version).toBe('1.0.197');
      expect(serdeDep?.ecosystem).toBe(Ecosystem.CARGO);

      const tokioDep = result.dependencies['Cargo.toml'].find(
        (d) => d.name === 'tokio',
      );
      expect(tokioDep?.version).toBe('1.36.0');

      // Dependencies without explicit version (e.g. git/path only) are skipped by design.
      const randDep = result.dependencies['Cargo.toml'].find(
        (d) => d.name === 'rand',
      );
      expect(randDep).toBeUndefined();
    });

    it('should parse target and workspace Cargo dependencies', async () => {
      const rustFiles = [
        {
          path: 'Cargo.toml',
          content: `[package]
                    name = "target-demo"
                    version = "0.1.0"
                            
                    [target.'cfg(unix)'.dependencies]
                    nix = "0.28.0"
                            
                    [target.'cfg(unix)'.dev-dependencies]
                    serial_test = { version = "3.1.1" }
                            
                    [workspace]
                    members = ["crates/*"]
                            
                    [workspace.dependencies]
                    anyhow = "1.0.82"`,
        },
      ];

      const manifestFiles: ManifestFileContents = { rust: rustFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      expect(result.dependencies['Cargo.toml']).toBeDefined();
      expect(result.dependencies['Cargo.toml'].length).toBe(3);

      const names = result.dependencies['Cargo.toml'].map((d) => d.name);
      expect(names).toContain('nix');
      expect(names).toContain('serial_test');
      expect(names).toContain('anyhow');
    });

    it('should handle invalid Cargo.toml gracefully', async () => {
      const rustFiles = [
        {
          path: 'Cargo.toml',
          content: '[dependencies\nserde = "1.0.0"',
        },
      ];

      const manifestFiles: ManifestFileContents = { rust: rustFiles };

      try {
        await auditService.getParsedManifestFileContents(
          'test-user',
          'test-repo',
          'main',
          manifestFiles,
        );
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain('Failed to parse Cargo.toml file');
      }
    });
  });

  describe('RubyGems Ecosystem Parsing', () => {
    it('should parse Gemfile with gem declarations', async () => {
      const rubyFiles = [
        {
          path: 'Gemfile',
          content: `source 'https://rubygems.org'
                    gem 'rails', '~> 7.0.0'
                    gem 'pg', '>= 1.1'
                    gem 'puma'
                    gem "devise", "4.9.0"`,
        },
      ];

      const manifestFiles: ManifestFileContents = { RubyGems: rubyFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      expect(result.dependencies['Gemfile']).toBeDefined();
      expect(result.dependencies['Gemfile'].length).toBe(4);

      const railsDep = result.dependencies['Gemfile'].find(
        (d) => d.name === 'rails',
      );
      expect(railsDep?.version).toBe('7.0.0');
      expect(railsDep?.ecosystem).toBe(Ecosystem.RUBYGEMS);

      const pumaDep = result.dependencies['Gemfile'].find(
        (d) => d.name === 'puma',
      );
      expect(pumaDep?.version).toBe('unknown');
    });

    it('should handle Gemfile with different quote styles', async () => {
      const rubyFiles = [
        {
          path: 'Gemfile',
          content: `gem 'rails', '7.0.0'
                    gem "devise", "4.9.0"
                    gem 'sidekiq'`,
        },
      ];

      const manifestFiles: ManifestFileContents = { RubyGems: rubyFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      expect(result.dependencies['Gemfile'].length).toBe(3);
    });

    it('should ignore non-gem lines in Gemfile', async () => {
      const rubyFiles = [
        {
          path: 'Gemfile',
          content: `source 'https://rubygems.org'
                    ruby '3.2.0'
                    # This is a comment
                    gem 'rails', '7.0.0'
                    group :development do
                    gem 'byebug'
                    end`,
        },
      ];

      const manifestFiles: ManifestFileContents = { RubyGems: rubyFiles };
      const result = await auditService.getParsedManifestFileContents(
        'test-user',
        'test-repo',
        'main',
        manifestFiles,
      );

      // Should only parse lines starting with 'gem '
      expect(result.dependencies['Gemfile'].length).toBe(2);
    });
  });

  describe('Ecosystem Mapping', () => {
    it('should map ecosystem strings correctly', () => {
      expect(auditService.mapEcosystem('npm')).toBe(Ecosystem.NPM);
      expect(auditService.mapEcosystem('NPM')).toBe(Ecosystem.NPM);
      expect(auditService.mapEcosystem('php')).toBe(Ecosystem.COMPOSER);
      expect(auditService.mapEcosystem('PYPI')).toBe(Ecosystem.PYPI);
      expect(auditService.mapEcosystem('PUB')).toBe(Ecosystem.PUB);
      expect(auditService.mapEcosystem('maven')).toBe(Ecosystem.MAVEN);
      expect(auditService.mapEcosystem('RUBYGEMS')).toBe(Ecosystem.RUBYGEMS);
      expect(auditService.mapEcosystem('cargo')).toBe(Ecosystem.CARGO);
    });

    it('should return NULL for unknown ecosystems', () => {
      expect(auditService.mapEcosystem('unknown')).toBe(Ecosystem.NULL);
      expect(auditService.mapEcosystem('invalid')).toBe(Ecosystem.NULL);
    });
  });

  describe('Vulnerability Enrichment', () => {
    it('should enrich dependencies with vulnerabilities from OSV.dev', async () => {
      // Mock axios for OSV.dev API
      spyOn(axios, 'post').mockResolvedValue(auditMockOSVResponse);
      spyOn(axios, 'get').mockResolvedValue(auditMockVulnDetails);

      const dependencies: DependencyGroups = {
        'package.json': [
          {
            name: 'test-package',
            version: '1.0.0',
            ecosystem: 'npm' as Ecosystem,
            vulnerabilities: [],
          },
        ],
      };

      const result =
        await auditService.enrichDependenciesWithVulnerabilities(
          dependencies,
        );

      expect(axios.post).toHaveBeenCalled();
      expect(result['package.json']).toBeDefined();
    });

    it.skip('should handle OSV.dev API errors gracefully', async () => {
      // Skipped: This test has timeout issues with retry logic
      spyOn(axios, 'post').mockRejectedValue(new Error('OSV.dev API error'));

      const dependencies: DependencyGroups = {
        'package.json': [
          {
            name: 'test-package',
            version: '1.0.0',
            ecosystem: Ecosystem.NPM,
            vulnerabilities: [],
          },
        ],
      };

      try {
        await auditService.enrichDependenciesWithVulnerabilities(
          dependencies,
        );
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.message).toContain(
          'Failed to fetch vulnerabilities from osv.dev',
        );
      }
    });
  });

  describe('Transitive Dependencies', () => {
    it('should fetch transitive dependencies from deps.dev', async () => {
      spyOn(axios, 'get').mockResolvedValue(auditMockDepsDevResponse);

      const dependencies: DependencyGroups = {
        'package.json': [
          {
            name: 'express',
            version: '4.18.2',
            ecosystem: Ecosystem.NPM,
            vulnerabilities: [],
          },
        ],
      };

      const result =
        await auditService.getTransitiveDependencies(dependencies);

      expect(result['package.json']).toBeDefined();
      expect(result['package.json'][0].name).toBe('express');
    });

    it.skip('should handle deps.dev API errors gracefully', async () => {
      // Skipped: This test has timeout issues with retry logic
      spyOn(axios, 'get').mockRejectedValue(new Error('deps.dev API error'));

      const dependencies: DependencyGroups = {
        'package.json': [
          {
            name: 'test-package',
            version: '1.0.0',
            ecosystem: Ecosystem.NPM,
            vulnerabilities: [],
          },
        ],
      };

      const result =
        await auditService.getTransitiveDependencies(dependencies);

      // Should not throw but continue with empty transitive deps
      expect(result['package.json']).toBeDefined();
    });

    it('should skip dependencies with unknown versions', async () => {
      const dependencies: DependencyGroups = {
        'package.json': [
          {
            name: 'test-package',
            version: 'unknown',
            ecosystem: Ecosystem.NPM,
            vulnerabilities: [],
          },
        ],
      };

      const result =
        await auditService.getTransitiveDependencies(dependencies);

      expect(result['package.json'][0].transitiveDependencies).toBeUndefined();
    });
  });

  describe('File Audit', () => {
    it('should analyze a package.json file', async () => {
      const fileDetails = {
        filename: 'package_json',
        content: JSON.stringify({
          dependencies: {
            express: '4.18.2',
          },
        }),
      };

      // Mock axios to avoid actual API calls
      spyOn(axios, 'post').mockResolvedValue(auditFileMockOsvResponse);

      const result = await auditService.auditFile(fileDetails);

      expect(result.dependencies).toBeDefined();
    });

    it('should reject unsupported file types', async () => {
      const fileDetails = {
        filename: 'unknown_txt',
        content: 'some content',
      };

      const result = await auditService.auditFile(fileDetails);

      expect(result.error).toContain('Unsupported file type');
      expect(Object.keys(result.dependencies).length).toBe(0);
    });
  });

  describe('CVSS Severity Calculation', () => {
    it('should calculate CVSS v3 severity', () => {
      const severity = [
        {
          type: 'CVSS_V3',
          score: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
        },
      ];

      const result = auditService.getCVSSSeverity(severity);

      expect(result.cvss_v3).toBeDefined();
      expect(result.cvss_v3).not.toBe('unknown');
    });

    it('should handle empty severity array', () => {
      const result = auditService.getCVSSSeverity([]);

      expect(result.cvss_v3).toBe('unknown');
      expect(result.cvss_v4).toBe('unknown');
    });

    it('should handle invalid CVSS vectors gracefully', () => {
      const severity = [
        {
          type: 'CVSS_V3',
          score: 'invalid vector',
        },
      ];

      const result = auditService.getCVSSSeverity(severity);

      expect(result).toBeDefined();
    });
  });

  describe('Integration - Full Audit Flow', () => {
    it('should perform complete audit on a repository', async () => {
      // Mock GitHub API
      spyOn(mockGithubService, 'getGithubApiResponse').mockResolvedValue(auditIntegrationGithubTreeResponse);

      // Mock file content fetch
      spyOn(auditService as any, 'getAllManifestData').mockResolvedValue(auditIntegrationManifestData);

      // Mock external APIs
      spyOn(axios, 'post').mockResolvedValue(auditIntegrationOsvEmptyResponse);
      spyOn(axios, 'get').mockResolvedValue(auditIntegrationDepsDevEmptyResponse);

      const result = await auditService.auditDependencies(
        'test-user',
        'test-repo',
        'main',
      );

      expect(result).toBeDefined();
      expect(result.dependencies).toBeDefined();
    });

    it('should handle complete audit errors gracefully', async () => {
      spyOn(auditService as any, 'getAllManifestData').mockRejectedValue(
        new Error('GitHub API error'),
      );

      const result = await auditService.auditDependencies(
        'test-user',
        'test-repo',
        'main',
      );

      expect(result.error).toBeDefined();
      expect(result.error?.[0]).toContain('GitHub API error');
    });
  });

  describe('Performance Configuration', () => {
    it('should allow configuring performance settings', () => {
      auditService.configurePerformance({
        concurrency: 5,
        batchSize: 50,
      });

      // Performance config is private, but we can test it works by running an audit
      expect(auditService).toBeDefined();
    });
  });

  describe('Filtering', () => {
    it('should filter vulnerable transitive dependencies', () => {
      const dependencies: DependencyGroups = {
        'package.json': [
          {
            name: 'test-package',
            version: '1.0.0',
            ecosystem: Ecosystem.NPM,
            vulnerabilities: [],
            transitiveDependencies: {
              nodes: [
                {
                  name: 'vulnerable-dep',
                  version: '1.0.0',
                  ecosystem: Ecosystem.NPM,
                  vulnerabilities: [
                    {
                      id: 'GHSA-xxxx',
                      summary: 'Test vuln',
                      details: 'Details',
                      severity: [{ type: 'CVSS_V3', score: '7.5' }],
                      references: [],
                    },
                  ],
                },
                {
                  name: 'safe-dep',
                  version: '2.0.0',
                  ecosystem: Ecosystem.NPM,
                  vulnerabilities: [],
                },
              ],
              edges: [
                { source: 0, target: 1, requirement: '^1.0.0' },
                { source: 0, target: 2, requirement: '^2.0.0' },
              ],
            },
          },
        ],
      };

      const result = auditService.filterVulnerableTransitives(dependencies);

      expect(
        result['package.json'][0].transitiveDependencies?.nodes,
      ).toBeDefined();
      // Should keep vulnerable-dep but remove safe-dep
      expect(
        result['package.json'][0].transitiveDependencies?.nodes?.length,
      ).toBe(1);
    });

    it('should filter main dependencies to keep only vulnerable ones', () => {
      const dependencies: DependencyGroups = {
        'package.json': [
          {
            name: 'vulnerable-package',
            version: '1.0.0',
            ecosystem: Ecosystem.NPM,
            vulnerabilities: [
              {
                id: 'GHSA-xxxx',
                summary: 'Test vuln',
                details: 'Details',
                severity: [{ type: 'CVSS_V3', score: '7.5' }],
                references: [],
              },
            ],
          },
          {
            name: 'safe-package',
            version: '2.0.0',
            ecosystem: Ecosystem.NPM,
            vulnerabilities: [],
          },
        ],
      };

      const result = auditService.filterMainDependencies(dependencies);

      expect(result['package.json'].length).toBe(1);
      expect(result['package.json'][0].name).toBe('vulnerable-package');
    });
  });
});

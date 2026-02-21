import type { DependencyApiResponse } from '../../constants/model';
import { Ecosystem } from '../../constants/model';

export const mockSmartActions = [
  {
    title: 'Prioritize critical direct dependencies',
    description: 'Fix highest-risk direct packages first to reduce exploit exposure.',
    impact: 'Reduces immediate production risk',
    estimated_time: '20 minutes',
  },
  {
    title: 'Resolve vulnerable transitive dependencies',
    description: 'Update parent packages to pull patched transitive versions.',
    impact: 'Cuts transitive attack surface',
    estimated_time: '25 minutes',
  },
  {
    title: 'Run validation and rollback readiness checks',
    description: 'Execute tests and verify rollback commands before release.',
    impact: 'Lowers deployment regression risk',
    estimated_time: '15 minutes',
  },
];

export const mockAuditData: DependencyApiResponse = {
  dependencies: {
    'package.json': [
      {
        name: 'lodash',
        version: '4.17.19',
        ecosystem: Ecosystem.NPM,
        dependencyType: 'DIRECT',
        vulnerabilities: [
          {
            id: 'CVE-2021-23337',
            details: 'Lodash allows command injection',
            exploitAvailable: true,
            fixAvailable: '4.17.21',
            severityScore: {
              cvss_v3: '7.5',
            },
            references: [],
          },
          {
            id: 'CVE-2020-8203',
            details: 'Prototype pollution vulnerability',
            exploitAvailable: false,
            fixAvailable: '4.17.21',
            severityScore: {
              cvss_v3: '8.1',
            },
            references: [],
          },
        ],
      },
      {
        name: 'axios',
        version: '0.21.0',
        ecosystem: Ecosystem.NPM,
        dependencyType: 'DIRECT',
        vulnerabilities: [
          {
            id: 'CVE-2021-3749',
            details: 'Server-Side Request Forgery vulnerability',
            exploitAvailable: true,
            fixAvailable: '0.21.4',
            severityScore: {
              cvss_v3: '9.8',
            },
            references: [],
          },
        ],
      },
      {
        name: 'express',
        version: '4.17.0',
        ecosystem: Ecosystem.NPM,
        dependencyType: 'DIRECT',
        vulnerabilities: [],
        transitiveDependencies: {
          nodes: [
            {
              name: 'qs',
              version: '6.7.0',
              ecosystem: Ecosystem.NPM,
              dependencyType: 'INDIRECT',
              vulnerabilities: [
                {
                  id: 'CVE-2022-24999',
                  details: 'Prototype pollution in qs',
                  exploitAvailable: false,
                  fixAvailable: '6.11.0',
                  severityScore: {
                    cvss_v3: '7.5',
                  },
                  references: [],
                },
              ],
            },
          ],
          edges: [
            {
              source: 0,
              target: 0,
              requirement: '^6.7.0',
            },
          ],
        },
      },
    ],
  },
};

export const agentPriorityScoreMockVuln = {
  id: 'TEST-001',
  severityScore: { cvss_v3: '8.0' },
  exploitAvailable: true,
  fixAvailable: '1.0.0',
};

export const agentPriorityScoreMockDep = {
  dependencyLevel: 'direct',
  usageFrequency: 5,
};

export const agentCliPhaseFixtures = [
  {
    phase_title: 'Phase 1',
    fixes: [
      {
        package: 'lodash',
        target_version: '4.17.21',
        action: 'upgrade',
      },
      {
        package: 'axios',
        target_version: '1.6.0',
        action: 'upgrade',
      },
    ],
  },
];

export const agentBashPhaseFixtures = [
  {
    phase_title: 'Critical Fixes',
    estimated_time: '15 minutes',
    fixes: [
      {
        package: 'lodash',
        target_version: '4.17.21',
        action: 'upgrade',
      },
    ],
  },
];

export const agentValidCommandsFixture = {
  phase_1: {
    commands: ['npm update lodash@4.17.21', 'npm install axios@1.6.0'],
  },
};

export const agentInvalidCommandsFixture = {
  phase_1: {
    commands: ['invalid command', 'rm -rf /'],
  },
};

export const agentCommandsWithForceFixture = {
  phase_1: {
    commands: ['npm install --force package@1.0.0'],
  },
};

export const agentBatchFixPlanResult = {
  batchId: 1,
  dependencies: [],
};

export const agentExecutiveSummaryResult = {
  critical_insights: ['Test insight'],
  total_vulnerabilities: 4,
  fixable_count: 4,
  estimated_fix_time: '30 minutes',
  risk_score: 7,
  quick_wins: ['Quick win 1'],
};

export const agentPriorityPhasesResult = [
  {
    phase: 1,
    name: 'Test Phase',
    fixes: [],
    batch_commands: [],
    validation_steps: [],
    estimated_time: '10 minutes',
  },
];

export const agentRiskManagementResult = {
  overall_assessment: 'Test assessment',
  breaking_changes_summary: {
    has_breaking_changes: false,
    count: 0,
    affected_areas: [],
    mitigation_steps: [],
  },
  testing_strategy: {
    unit_tests: 'Run unit tests',
    integration_tests: 'Run integration tests',
    regression_tests: 'Run regression tests',
    manual_verification: 'Manual checks',
    security_validation: 'Security scan',
  },
};

export const auditMockOSVResponse = {
  data: {
    results: [
      {
        vulns: [
          {
            id: 'GHSA-xxxx-yyyy-zzzz',
          },
        ],
      },
    ],
  },
};

export const auditMockVulnDetails = {
  data: {
    id: 'GHSA-xxxx-yyyy-zzzz',
    summary: 'Test vulnerability',
    details: 'This is a test vulnerability',
    severity: [
      {
        type: 'CVSS_V3',
        score: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
      },
    ],
    affected: [
      {
        package: {
          name: 'test-package',
          ecosystem: 'npm',
        },
        ranges: [
          {
            type: 'SEMVER',
            events: [{ introduced: '0' }, { fixed: '1.2.3' }],
          },
        ],
      },
    ],
    references: [
      {
        type: 'WEB',
        url: 'https://example.com/advisory',
      },
    ],
  },
};

export const auditMockDepsDevResponse = {
  data: {
    nodes: [
      {
        versionKey: {
          system: 'NPM',
          name: 'lodash',
          version: '4.17.21',
        },
      },
    ],
    edges: [
      {
        fromNode: 0,
        toNode: 1,
        requirement: '^4.17.0',
      },
    ],
  },
};

export const auditFileMockOsvResponse = {
  data: { results: [] },
};

export const auditIntegrationGithubTreeResponse = {
  data: {
    tree: [
      {
        path: 'package.json',
        type: 'blob',
      },
    ],
  },
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
};

export const auditIntegrationManifestData = {
  npm: [
    {
      path: 'package.json',
      content: JSON.stringify({
        dependencies: { express: '4.18.2' },
      }),
    },
  ],
};

export const auditIntegrationOsvEmptyResponse = {
  data: { results: [] },
};

export const auditIntegrationDepsDevEmptyResponse = {
  data: { nodes: [], edges: [] },
};

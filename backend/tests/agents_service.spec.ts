/**
 * Test suite for AgentsServiceNew
 *
 * This file demonstrates how to use the new multi-agent architecture
 * and validates its core functionality.
 */

import type { DependencyApiResponse } from '../constants/model';
import { Ecosystem } from '../constants/model';
import AgentsServiceNew from '../service/agents_service';

// Mock OpenRouter SDK
jest.mock('@openrouter/sdk', () => ({
  OpenRouter: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

// Mock dependency data for testing
const mockAnalysisData: DependencyApiResponse = {
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

describe('AgentsServiceNew', () => {
  let service: AgentsServiceNew;
  let progressEvents: Array<{ step: string; message: string; data?: any }>;

  beforeEach(() => {
    // Mock environment variables
    process.env.OPEN_ROUTER_KEY = 'test-key';
    process.env.DEFAULT_MODEL = 'openai/gpt-4';

    service = new AgentsServiceNew(mockAnalysisData);
    progressEvents = [];
  });

  describe('Phase 0: Smart Preprocessing', () => {
    it('should flatten dependencies correctly', () => {
      // Access private property for testing (normally not recommended)
      const flattenedData = (service as any).flattenedAnalysisData;

      expect(flattenedData).toBeDefined();
      expect(flattenedData.length).toBeGreaterThan(0);

      // Check direct dependencies
      const directDeps = flattenedData.filter(
        (d: any) => d.dependencyLevel === 'direct',
      );
      expect(directDeps.length).toBe(3); // lodash, axios, express

      // Check transitive dependencies
      const transitiveDeps = flattenedData.filter(
        (d: any) => d.dependencyLevel === 'transitive',
      );
      expect(transitiveDeps.length).toBe(1); // qs
    });

    it('should track usage frequency in flattened data', () => {
      const flattenedData = (service as any).flattenedAnalysisData;

      // Check that usage frequency is tracked
      const lodashDep = flattenedData.find(
        (d: any) => d.name === 'lodash' && d.version === '4.17.19',
      );
      expect(lodashDep).toBeDefined();
      expect(lodashDep.usageFrequency).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Phase 1: Parallel Intelligence Layer', () => {
    it('should prioritize vulnerabilities correctly', () => {
      const parallelResults = (service as any).runParallelAnalysis();

      expect(parallelResults.priorities).toBeDefined();
      expect(parallelResults.priorities.length).toBeGreaterThan(0);

      // Check that axios SSRF (CVSS 9.8) is highest priority
      const topPriority = parallelResults.priorities[0];
      expect(topPriority.id).toBe('CVE-2021-3749');
      expect(topPriority.riskLevel).toBe('critical');
    });

    it('should identify transitive intelligence opportunities', () => {
      const parallelResults = (service as any).runParallelAnalysis();

      expect(parallelResults.transitiveInsights).toBeDefined();
      // In this test data, qs is a transitive dep with vulnerabilities
    });

    it('should detect conflicts', () => {
      const parallelResults = (service as any).runParallelAnalysis();

      expect(parallelResults.conflicts).toBeDefined();
      expect(Array.isArray(parallelResults.conflicts)).toBe(true);
    });

    it('should identify quick wins', () => {
      const parallelResults = (service as any).runParallelAnalysis();

      expect(parallelResults.quickWins).toBeDefined();
      expect(parallelResults.quickWins.length).toBeGreaterThan(0);

      // lodash and axios should be quick wins (direct deps with fixes)
      const lodashQuickWin = parallelResults.quickWins.find((qw: any) =>
        qw.package.includes('lodash'),
      );
      expect(lodashQuickWin).toBeDefined();
      expect(lodashQuickWin.type).toBe('direct_upgrade');
    });
  });

  describe('Priority Scoring', () => {
    it('should calculate priority score with all factors', () => {
      const calculatePriorityScore = (
        service as any
      ).calculatePriorityScore.bind(service);

      const mockVuln = {
        id: 'TEST-001',
        severityScore: { cvss_v3: '8.0' },
        exploitAvailable: true,
        fixAvailable: '1.0.0',
      };

      const mockDep = {
        dependencyLevel: 'direct',
        usageFrequency: 5,
      };

      const score = calculatePriorityScore(mockVuln, mockDep);

      // Score should be: 8.0 (CVSS) + 5 (exploit) + 3 (fix) + 2 (direct) + 2 (usage) = 20
      expect(score).toBe(20);
    });

    it('should assign correct risk levels', () => {
      const getRiskLevel = (service as any).getRiskLevel.bind(service);

      expect(getRiskLevel(20)).toBe('critical'); // >= 15
      expect(getRiskLevel(12)).toBe('high'); // >= 10
      expect(getRiskLevel(7)).toBe('medium'); // >= 5
      expect(getRiskLevel(3)).toBe('low'); // < 5
    });
  });

  describe('Adaptive Batching', () => {
    it('should create batches of correct sizes', () => {
      const createBatches = (service as any).createBatches.bind(service);

      const items = Array.from({ length: 25 }, (_, i) => ({ id: i }));

      const batches = createBatches(items, 10);
      expect(batches.length).toBe(3); // 10 + 10 + 5
      expect(batches[0].length).toBe(10);
      expect(batches[1].length).toBe(10);
      expect(batches[2].length).toBe(5);
    });
  });

  describe('CLI Command Generation', () => {
    it('should generate valid npm update commands', () => {
      const mockPhases = [
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

      const generateCLICommands = (service as any).generateCLICommands.bind(
        service,
      );
      const commands = generateCLICommands(mockPhases);

      expect(commands.phase_1).toBeDefined();
      expect(commands.phase_1.commands).toContain(
        'npm update lodash@4.17.21 axios@1.6.0',
      );
    });
  });

  describe('Rollback Procedures', () => {
    it('should generate rollback commands', () => {
      const generateRollbackProcedures = (
        service as any
      ).generateRollbackProcedures.bind(service);
      const rollback = generateRollbackProcedures();

      expect(rollback.backup_command).toContain('npm list --json');
      expect(rollback.emergency_rollback).toContain('git checkout');
      expect(rollback.restore_instructions).toBeDefined();
      expect(rollback.restore_instructions.length).toBeGreaterThan(0);
    });
  });

  describe('Bash Script Generation', () => {
    it('should generate valid bash script', () => {
      const mockPhases = [
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

      const generateBashScript = (service as any).generateBashScript.bind(
        service,
      );
      const script = generateBashScript(mockPhases, '2026-01-13');

      expect(script).toContain('#!/bin/bash');
      expect(script).toContain('set -e');
      expect(script).toContain('npm update');
      expect(script).toContain('lodash@4.17.21');
      expect(script).toContain('Creating backup');
    });
  });

  describe('Script Validation', () => {
    it('should validate npm commands', () => {
      const validateScripts = (service as any).validateScripts.bind(service);

      const validCommands = {
        phase_1: {
          commands: ['npm update lodash@4.17.21', 'npm install axios@1.6.0'],
        },
      };

      const result = validateScripts(validCommands);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect invalid commands', () => {
      const validateScripts = (service as any).validateScripts.bind(service);

      const invalidCommands = {
        phase_1: {
          commands: ['invalid command', 'rm -rf /'],
        },
      };

      const result = validateScripts(invalidCommands);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about force flags', () => {
      const validateScripts = (service as any).validateScripts.bind(service);

      const commandsWithForce = {
        phase_1: {
          commands: ['npm install --force package@1.0.0'],
        },
      };

      const result = validateScripts(commandsWithForce);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('--force');
    });
  });

  describe('Integration: Full Workflow', () => {
    it('should track progress through all phases', async () => {
      // Mock AI calls
      jest.spyOn(service as any, 'batchFixPlanAgent').mockResolvedValue({
        batchId: 1,
        dependencies: [],
      });

      jest.spyOn(service as any, 'generateExecutiveSummary').mockResolvedValue({
        critical_insights: ['Test insight'],
        total_vulnerabilities: 4,
        fixable_count: 4,
        estimated_fix_time: '30 minutes',
        risk_score: 7,
        quick_wins: ['Quick win 1'],
      });

      jest.spyOn(service as any, 'generatePriorityPhases').mockResolvedValue([
        {
          phase: 1,
          name: 'Test Phase',
          fixes: [],
          batch_commands: [],
          validation_steps: [],
          estimated_time: '10 minutes',
        },
      ]);

      jest.spyOn(service as any, 'generateRiskManagement').mockResolvedValue({
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
      });

      const progressCallback = (step: string, message: string, data?: any) => {
        progressEvents.push({ step, message, data });
      };

      await service.generateUnifiedFixPlan(progressCallback);

      // Verify all phases were tracked
      expect(progressEvents.some((e) => e.step === 'preprocessing_start')).toBe(
        true,
      );
      expect(
        progressEvents.some((e) => e.step === 'preprocessing_complete'),
      ).toBe(true);
      expect(
        progressEvents.some((e) => e.step === 'parallel_analysis_start'),
      ).toBe(true);
      expect(
        progressEvents.some((e) => e.step === 'parallel_analysis_complete'),
      ).toBe(true);
      expect(
        progressEvents.some((e) => e.step === 'batch_processing_start'),
      ).toBe(true);
      expect(
        progressEvents.some((e) => e.step === 'batch_processing_complete'),
      ).toBe(true);
      expect(progressEvents.some((e) => e.step === 'synthesis_start')).toBe(
        true,
      );
      expect(progressEvents.some((e) => e.step === 'synthesis_complete')).toBe(
        true,
      );
      expect(progressEvents.some((e) => e.step === 'enrichment_start')).toBe(
        true,
      );
      expect(progressEvents.some((e) => e.step === 'enrichment_complete')).toBe(
        true,
      );
    });

    it('should include detailed metadata in final output', async () => {
      // Mock AI calls
      jest.spyOn(service as any, 'batchFixPlanAgent').mockResolvedValue({
        batchId: 1,
        dependencies: [],
      });

      jest.spyOn(service as any, 'generateExecutiveSummary').mockResolvedValue({
        critical_insights: ['Test insight'],
        total_vulnerabilities: 4,
        fixable_count: 4,
        estimated_fix_time: '30 minutes',
        risk_score: 7,
        quick_wins: ['Quick win 1'],
      });

      jest.spyOn(service as any, 'generatePriorityPhases').mockResolvedValue([
        {
          phase: 1,
          name: 'Test Phase',
          fixes: [],
          batch_commands: [],
          validation_steps: [],
          estimated_time: '10 minutes',
        },
      ]);

      jest.spyOn(service as any, 'generateRiskManagement').mockResolvedValue({
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
      });

      const result: Record<string, unknown> =
        await service.generateUnifiedFixPlan(() => {});

      expect(result.metadata).toBeDefined();
      expect((result.metadata as any).generated_at).toBeDefined();
      expect((result.metadata as any).total_packages_analyzed).toBeGreaterThan(
        0,
      );
      expect(result.automated_execution).toBeDefined();
      expect((result.automated_execution as any).cli_commands).toBeDefined();
      expect(
        (result.automated_execution as any).rollback_procedures,
      ).toBeDefined();
      expect(
        (result.automated_execution as any).one_click_script,
      ).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete preprocessing in < 1 second', () => {
      const start = Date.now();
      (service as any).flattenDependencies();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });

    it('should complete parallel analysis in < 3 seconds', () => {
      const start = Date.now();
      (service as any).runParallelAnalysis();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(3000);
    });
  });
});
